const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const { usersRoute } = require("./users/usersRoute");


admin.initializeApp();

const app = express();

// Automatically allow cross-origin requests.
app.use(cors({origin: true}));

app.use(bodyParser.json());

// Set handler for individual user accounts.
usersRoute(app);

// Expose Express API as a single Cloud Function.
exports.api = functions.https.onRequest(app);
