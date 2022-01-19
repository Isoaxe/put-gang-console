import admin from "firebase-admin";
import { newSubscriber } from "./../util/helpers.js";
import { ADMIN_UID } from "./../util/constants.js";


// Create a new payment.
export async function create (req, res) {
	try {
		const { uid, role, subscribed, email } = res.locals;
		const { type } = req.params;
		const db = admin.firestore();

		// Check if user is a new subscriber.
		const newSub = newSubscriber(subscribed, type);

		// Get current user and stats data.
		const userRef = await db.collection("users").doc(uid).get();
		const userData = userRef.data();
		const stats = db.collection("payments").doc(uid).collection("stats").doc("stats");
		const statsRef = await stats.get();
		const statsData = statsRef.data();

		if (!statsData && ["admin", "level-1", "level-2"].includes(role)) {
			// Initialize all stats. These data relate to the user's earnings from their downline.
			const [revenue, mrr, paid, unpaid, sales, invoiceId] = Array(6).fill(0);
			stats.set({
				name: "",
				email,
				revenue,
				mrr,
				paid,
				unpaid,
				sales,
				invoiceId
			});
		}

		// Initialize the totals for admin user.
		if (!statsData && role === "admin") {
			const [totalRevenue, totalMrr] = Array(2).fill(0);
			stats.set({
				totalRevenue,
				totalMrr
			}, { merge: true });
		}

		// Get admin stats as payments from all users will accrue here.
		const adminUser = db.collection("payments").doc(ADMIN_UID);
		const adminStats = adminUser.collection("stats").doc("stats");
		const adminStatsRef = await adminStats.get();
		const adminStatsData = adminStatsRef.data();
		let { totalRevenue, totalMrr } = adminStatsData;
		let adminRevenue = adminStatsData.revenue;
		let adminMrr = adminStatsData.mrr;
		let adminUnpaid = adminStatsData.unpaid;
		let adminSales = adminStatsData.sales;

		// Initialize variables for use below.
		let upline, uplineUid, uplineRevenue, uplineMrr, uplineUnpaid, uplineSales, uplineInvoiceId, uplineStats;

		// Get upline stats. Same as admin if level-1 user.
		if (role !== "admin" && role !== "standard") {
			uplineUid = userData.uplineUid;
			upline = db.collection("payments").doc(uplineUid);
			uplineStats = upline.collection("stats").doc("stats");
			const uplineStatsRef = await uplineStats.get();
			const uplineStatsData = uplineStatsRef.data();
			uplineRevenue = uplineStatsData.revenue;
			uplineMrr = uplineStatsData.mrr;
			uplineUnpaid = uplineStatsData.unpaid;
			uplineSales = uplineStatsData.sales;
			uplineInvoiceId = uplineStatsData.invoiceId;
		}

		// Initialize variables for use below.
		let topline, toplineRevenue, toplineMrr, toplineUnpaid, toplineSales, toplineInvoiceId, toplineStats;

		// Get the upline's upline (will be level-1) for level-3 users.
		if (role === "level-3") {
			// Get upline user data.
			const uplineRef = await db.collection("users").doc(uplineUid).get();
			const uplineData = uplineRef.data();

			// Get topline stats. Will be level-1 user.
			const toplineUid = uplineData.uplineUid; // The upline's upline.
			topline = db.collection("payments").doc(toplineUid);
			toplineStats = topline.collection("stats").doc("stats");
			const toplineStatsRef = await toplineStats.get();
			const toplineStatsData = toplineStatsRef.data();
			toplineRevenue = toplineStatsData.revenue;
			toplineMrr = toplineStatsData.mrr;
			toplineUnpaid = toplineStatsData.unpaid;
			toplineSales = toplineStatsData.sales;
			toplineInvoiceId = toplineStatsData.invoiceId;
		}

		// Set value of payment type.
		let value;
		if (type === "join") value = 50;
		if (type === "watch") value = 150;

		// Add to admin MRR if new subscriber and not admin.
		if (newSub && role !== "admin") {
			totalMrr += value;
			if (role === "level-2" || role === "level-3") adminMrr += value / 2;
			if (role === "level-1" || role === "standard") adminMrr += value;
		}

		// Admin sales will always increment for all users.
		// The amount of revenue accruing to admin depends on user role.
		// This covers level-1 and standard users fully.
		if (role === "level-2" || role === "level-3") {
			adminUnpaid += value / 2;
			adminRevenue += value / 2;
		}
		if (role === "level-1" || role === "standard") adminRevenue += value;
		totalRevenue += value;
		adminSales++;
		adminStats.set({
			totalRevenue,
			totalMrr,
			revenue: adminRevenue,
			mrr: adminMrr,
			unpaid: adminUnpaid,
			sales: adminSales
		}, { merge: true });

		// Set stats for level-1 if level-2 user.
		if (role === "level-2") {
			if (newSub) uplineMrr += value / 2;
			uplineRevenue += value / 2;
			uplineUnpaid += value / 2;
			uplineSales++;
			uplineInvoiceId++;
			uplineStats.set({
				revenue: uplineRevenue,
				mrr: uplineMrr,
				unpaid: uplineUnpaid,
				sales: uplineSales,
				invoiceId: uplineInvoiceId
			}, { merge: true });
		}

		// Set stats for level-1 and level-2 if level-3 user.
		if (role === "level-3") {
			if (newSub) {
				uplineMrr += value / 4;
				toplineMrr += value / 4;
			}
			toplineRevenue += value / 4;
			toplineUnpaid += value / 4;
			toplineSales++;
			toplineInvoiceId++;
			toplineStats.set({
				revenue: toplineRevenue,
				mrr: toplineMrr,
				unpaid: toplineUnpaid,
				sales: toplineSales,
				invoiceId: toplineInvoiceId
			}, { merge: true });

			uplineRevenue += value / 4;
			uplineUnpaid += value / 4;
			uplineSales++;
			uplineInvoiceId++;
			uplineStats.set({
				revenue: uplineRevenue,
				mrr: uplineMrr,
				unpaid: uplineUnpaid,
				sales: uplineSales,
				invoiceId: uplineInvoiceId
			}, { merge: true });
		}

		if (newSub) await admin.auth().setCustomUserClaims(uid, { role, subscribed: true });

		// Now add the commission invoices themselves.
		const now = new Date();
		const date = now.toISOString();
		let commission;
		if (role === "level-2") commission = value / 2;
		if (role === "level-3") commission = value / 4;
		const invoice = {
			name: userData.name,
			uid,
			email,
			date,
			product: type,
			sale: value,
			commission,
			paid: false
		}

		// If level-2 user, generate invoice for upline (level-1) only.
		if (role === "level-2") {
			const uplineInvoice = upline.collection("invoices").doc(uplineInvoiceId.toString());
			uplineInvoice.set({ invoice });
		}

		// If level-3 user, generate invoices for upline (level-2) and topline (level-1).
		if (role === "level-3") {
			const uplineInvoice = upline.collection("invoices").doc(uplineInvoiceId.toString());
			uplineInvoice.set({ invoice });
			const toplineInvoice = topline.collection("invoices").doc(toplineInvoiceId.toString());
			toplineInvoice.set({ invoice });
		}

		return res.status(200).send({ message: `${email} has made a ${type} payment` });
	} catch (err) {
		return handleError(res, err);
	}
}


// Returns all payment data.
export async function all (req, res) {
	try {
		const { uid, role } = res.locals;
		const db = admin.firestore();

		// Get current user data.
		const userRef = await db.collection("users").doc(uid).get();
		const userData = userRef.data();

		// Variables used within conditionals below.
		let uids = [];
		const payments = {};
		const paymentsRef = db.collection("payments");

		// Get downline ids plus self for admin (i.e. all users).
		if (role === "admin") {
			const documents = await paymentsRef.listDocuments();
			documents.forEach(doc => {
				uids.push(doc.id);
			});
		}

		// Include downline and self for level-1 user.
		if (role === "level-1") {
			uids = userData.downlineUids;
			uids.push(uid);
		}

		// Only include self for level-2 user.
		if (role === "level-2") {
			uids.push(uid);
		}

		// Populate payment object with all relevant Firestore data.
		for (let i = 0; i < uids.length; i++) {
			const statsRef = await paymentsRef.doc(uids[i]).collection("stats").doc("stats").get();
			const stats = statsRef.data();
			const invoices = {};
			for (let j = 1; j <= stats.invoiceId; j++) {
				const invoiceNumber = j.toString(); // Cast as string for use as object key.
				const invoice = await paymentsRef.doc(uids[i]).collection("invoices").doc(invoiceNumber).get();
				const invoiceData = invoice.data();
				invoices[invoiceNumber] = invoiceData;
			}
			payments[uids[i]] = { stats, invoices };
		}

		return res.status(200).send(payments);
	} catch (err) {
		return handleError(res, err);
	}
}


// Returns statistics for user and their downlines.
export async function stats (req, res) {
	try {
		const { uid, role } = res.locals;
		const db = admin.firestore();

		// Get current user data.
		const userRef = await db.collection("users").doc(uid).get();
		const userData = userRef.data();

		// Variables used within conditionals below.
		let uids = [];
		const stats = {};
		const paymentsRef = db.collection("payments");

		// Get downline ids plus self for admin (i.e. all users).
		if (role === "admin") {
			const documents = await paymentsRef.listDocuments();
			documents.forEach(doc => {
				uids.push(doc.id);
			});
		}

		// Include downline and self for level-1 user.
		if (role === "level-1") {
			uids = userData.downlineUids;
			uids.push(uid);
		}

		// Only include self for level-2 user.
		if (role === "level-2") {
			uids.push(uid);
		}

		// Populate payment object with all relevant Firestore data.
		for (let i = 0; i < uids.length; i++) {
			const statsRef = await paymentsRef.doc(uids[i]).collection("stats").doc("stats").get();
			const statsData = statsRef.data();
			stats[uids[i]] = statsData;
		}

		return res.status(200).send(stats);
	} catch (err) {
		return handleError(res, err);
	}
}


// Standard error helper function.
function handleError (res, err) {
	return res.status(500).send({ error: `${err}` });
}
