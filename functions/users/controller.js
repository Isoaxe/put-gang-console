import admin from "firebase-admin";


// Create new level-1 user.
export async function create (req, res) {
	try {
		let role;
		const { email, password } = req.body;
		if (email === "phillymantis@gmail.com") {
			role = "admin";
		} else {
			role = "level-1";
		}

		const { uid } = await admin.auth().createUser({
			email,
			password
		});

		await admin.auth().setCustomUserClaims(uid, { role });

		// Not all required user data can be stored by auth. Use Firestore instead.
		const db = admin.firestore();
		const user = db.collection("users").doc(uid);
		user.set({
			uid,
			email,
			role,
			uplineUid: "", //TODO: Insert referrer uid here, else insert admin uid.
			downlineUids: []
		});

		return res.status(200).send({ message: "level-1 user created" });
	} catch (err) {
		return handleError(res, err);
	}
}


// Returns a list of all users.
export async function all (req, res) {
	try {
		const listUsers = await admin.auth().listUsers();
		const allUsers = listUsers.users.map(mapUser);

		return res.status(200).send(allUsers);
	} catch (err) {
		return handleError(res, err);
	}
}


// Helper function to create object containing user data.
function mapUser (user) {
	const customClaims = (user.customClaims || { role: "", businessId: "" });
	const role = customClaims.role;
	return {
		uid: user.uid,
		email: user.email || "",
		displayName: user.displayName || "",
		role,
		lastSignInTime: user.metadata.lastSignInTime,
		creationTime: user.metadata.creationTime.slice(5, 16)
	};
}


// Standard error helper function.
function handleError (res, err) {
	return res.status(500).send({ error: `${err}` });
}