import admin from "firebase-admin";


// Create a new payment.
export async function create (req, res) {
	try {
		const { type } = req.params;

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
