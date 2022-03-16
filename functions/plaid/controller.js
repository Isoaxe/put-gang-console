import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import { PLAID_CLIENT_ID } from "./../util/constants.js";

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET_KEY_SANDBOX,
    },
  },
});

const client = new PlaidApi(configuration);

// Create a link_token for initialization of Plaid Link.
export async function createLinkToken(req, res) {
  // TODO: Can I add Firebase uid later?
  const clientUserId = "Firebase uid here...";

  const request = {
    user: {
      // This should correspond to a unique id for the current user.
      client_user_id: clientUserId,
    },
    client_name: "Put Gang",
    products: [Products.Auth],
    language: "en",
    webhook: "https://webhook.example.com",
    country_codes: [CountryCode.Us],
  };
  try {
    const createTokenResponse = await client.linkTokenCreate(request);

    res.json(createTokenResponse.data);
  } catch (err) {
    return handleError(res, err);
  }
}

// Exchange a public token for an access token.
export async function exchangeTokens(req, res) {
  try {
    const response = await client.itemPublicTokenExchange(req.body);
    console.log(response);
    res.status(200).send(response);
  } catch (err) {
    handleError(res, err);
  }
}

// Standard error helper function.
function handleError(res, err) {
  return res.status(500).send({ error: `${err}` });
}
