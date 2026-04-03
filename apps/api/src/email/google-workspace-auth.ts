import { GoogleAuth, JWT } from "google-auth-library";

/**
 * Obtains a delegated access token for Google Workspace domain-wide delegation.
 *
 * Two modes are supported:
 *
 * 1. Key-based (legacy): pass `privateKey` — signs the JWT locally using the
 *    service account's private key (requires a downloaded JSON key file).
 *
 * 2. Keyless (GCP-native): omit `privateKey` — uses Application Default
 *    Credentials (the VM's attached service account via the metadata server, or
 *    `gcloud auth application-default login` on a dev machine) to call the GCP
 *    IAM `signJwt` API.  No JSON key file is needed; the VM SA must have
 *    `roles/iam.serviceAccountTokenCreator` on `clientEmail`.
 *
 * @param clientEmail   The workspace service account email (GOOGLE_WORKSPACE_CLIENT_EMAIL)
 * @param delegatedUser The workspace user to impersonate (GOOGLE_WORKSPACE_DELEGATED_USER)
 * @param scopes        OAuth scopes to request
 * @param privateKey    Optional PEM private key.  When omitted, keyless mode is used.
 */
export async function getWorkspaceDelegatedAccessToken(
  clientEmail: string,
  delegatedUser: string,
  scopes: string[],
  privateKey?: string
): Promise<string> {
  if (privateKey) {
    return getAccessTokenWithKey(clientEmail, delegatedUser, scopes, privateKey);
  }

  return getAccessTokenKeyless(clientEmail, delegatedUser, scopes);
}

// ── Key-based (existing behaviour) ──────────────────────────────────────────

async function getAccessTokenWithKey(
  clientEmail: string,
  delegatedUser: string,
  scopes: string[],
  privateKey: string
): Promise<string> {
  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes,
    subject: delegatedUser
  });

  const tokenResponse = await auth.authorize();

  if (!tokenResponse.access_token) {
    throw new Error("GOOGLE_GMAIL_ACCESS_TOKEN_MISSING");
  }

  return tokenResponse.access_token;
}

// ── Keyless (IAM signJwt) ─────────────────────────────────────────────────────

async function getAccessTokenKeyless(
  clientEmail: string,
  delegatedUser: string,
  scopes: string[]
): Promise<string> {
  // Step 1: Get an ADC access token to authenticate the signJwt call.
  // On a GCP VM this uses the attached service account via the metadata server.
  // On a dev machine it uses `gcloud auth application-default login`.
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/iam"]
  });

  const client = await auth.getClient();
  const adcToken = await client.getAccessToken();

  if (!adcToken.token) {
    throw new Error(
      "GOOGLE_ADC_TOKEN_MISSING: Could not obtain Application Default Credentials. " +
        "On GCP ensure a service account is attached to the VM. " +
        "Locally run: gcloud auth application-default login"
    );
  }

  // Step 2: Build the JWT claims for domain-wide delegation.
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    sub: delegatedUser,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: scopes.join(" ")
  };

  // Step 3: Sign the JWT via the IAM credentials API (no private key needed).
  const signUrl =
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
    `${encodeURIComponent(clientEmail)}:signJwt`;

  const signRes = await fetch(signUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adcToken.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ payload: JSON.stringify(claims) })
  });

  if (!signRes.ok) {
    const body = await signRes.text();
    throw new Error(
      `GOOGLE_SIGNJWT_FAILED (${signRes.status}): ${body}. ` +
        `Ensure the VM's service account has roles/iam.serviceAccountTokenCreator on ${clientEmail}.`
    );
  }

  const { signedJwt } = (await signRes.json()) as { signedJwt: string };

  // Step 4: Exchange the signed JWT for a Google OAuth access token.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt
    })
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED (${tokenRes.status}): ${body}`);
  }

  const { access_token } = (await tokenRes.json()) as { access_token?: string };

  if (!access_token) {
    throw new Error("GOOGLE_WORKSPACE_ACCESS_TOKEN_MISSING");
  }

  return access_token;
}
