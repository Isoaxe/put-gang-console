import admin from "firebase-admin";
import { ADMIN_UID } from "./../util/constants.js";


// Initialize payments for new user.
export async function init (req, res) {
	try {
		const { uid } = req.params;
		const { email } = req.body;
		const db = admin.firestore();
		const user = db.collection("payments").doc(uid);

		// Initialize all stats.
		const stats = user.collection("stats").doc("stats");
		// These data relate to the user's earnings from their downline.
		const [revenue, paid, unpaid, sales] = Array(4).fill(0);
		stats.set({
			name: "",
			email,
			revenue,
			paid,
			unpaid,
			sales
		});

		return res.status(200).send({ message: "Payments initialized for new user" });
	} catch (err) {
		return handleError(res, err);
	}
}


// Create a new payment.
export async function create (req, res) {
	try {
		const { uid, type } = req.params;
		const { name, email } = req.body;
		const db = admin.firestore();
		const user = db.collection("payments").doc(uid);

		// Get current user data.
		const userRef = await db.collection("users").doc(uid).get();
		const userData = userRef.data();
		const role = userData.role;

		// Get admin stats as payments from all users will accrue here.
		const adminUid = ADMIN_UID;
		const adminUser = db.collection("payments").doc(adminUid);
		const adminStats = adminUser.collection("stats").doc("stats");
		const adminStatsRef = await adminStats.get();
		const adminStatsData = adminStatsRef.data();
		let adminRevenue = adminStatsData.revenue;
		let adminUnpaid = adminStatsData.unpaid;
		let adminSales = adminStatsData.sales;

		return res.status(200).send({ message: `${type} payment made` });
	} catch (err) {
		return handleError(res, err);
	}
}


// Returns all payment data.
export async function all (req, res) {
	try {
		return res.status(200).send("Temp placeholder for payment data");
	} catch (err) {
		return handleError(res, err);
	}
}


// Standard error helper function.
function handleError (res, err) {
	return res.status(500).send({ error: `${err}` });
}
