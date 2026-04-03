import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { GoogleAuth, JWT } from "google-auth-library";
import { parseArgs } from "node:util";

type WorkspaceUserResponse = {
  primaryEmail?: string;
  id?: string;
  name?: {
    fullName?: string;
    givenName?: string;
    familyName?: string;
  };
};

type StaffRole = "admin" | "operations" | "front_desk";

const prisma = new PrismaClient();

function usage(): string {
  return [
    "Usage:",
    "  pnpm google-workspace:provision-user -- --primary-email test.user@aosanctuary.com --given-name Test --family-name User --password 'TempPass123!' [--alias qa.user@aosanctuary.com] [--org-unit-path /Testing] [--recovery-email owner@example.com] [--create-ao-staff-user] [--ao-role front_desk] [--dry-run]",
    "",
    "Required env:",
    "  GOOGLE_WORKSPACE_CLIENT_EMAIL",
    "  GOOGLE_WORKSPACE_DELEGATED_USER",
    "  GOOGLE_WORKSPACE_PRIVATE_KEY  (key-based mode — provide the SA private key)",
    "  --- OR ---",
    "  GOOGLE_WORKSPACE_KEYLESS=true (keyless mode — uses gcloud ADC + IAM signJwt)",
    "                                 Run: gcloud auth application-default login",
    "                                 ADC identity needs roles/iam.serviceAccountTokenCreator",
    "                                 on the workspace service account.",
    "Optional env:",
    "  GOOGLE_WORKSPACE_CUSTOMER_ID (defaults to my_customer)",
    "  DATABASE_URL (required only with --create-ao-staff-user)"
  ].join("\n");
}

function ensureValidRole(value: string | undefined): StaffRole {
  if (value === "admin" || value === "operations" || value === "front_desk") {
    return value;
  }

  throw new Error("Invalid --ao-role. Use one of: admin, operations, front_desk");
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return name === "GOOGLE_WORKSPACE_PRIVATE_KEY" ? value.replace(/\\n/g, "\n") : value;
}

function optionalEnv(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  return name === "GOOGLE_WORKSPACE_PRIVATE_KEY" ? value.replace(/\\n/g, "\n") : value;
}

/**
 * Obtains a delegated access token for domain-wide delegation.
 *
 * Key-based mode:  set GOOGLE_WORKSPACE_PRIVATE_KEY — signs the JWT locally.
 * Keyless mode:    omit GOOGLE_WORKSPACE_PRIVATE_KEY and set
 *                  GOOGLE_WORKSPACE_KEYLESS=true — uses Application Default
 *                  Credentials (gcloud auth application-default login) to call
 *                  the GCP IAM signJwt API.  The ADC identity needs
 *                  roles/iam.serviceAccountTokenCreator on the workspace SA.
 */
async function getAccessToken(scopes: string[]): Promise<string> {
  const clientEmail = requiredEnv("GOOGLE_WORKSPACE_CLIENT_EMAIL");
  const delegatedUser = requiredEnv("GOOGLE_WORKSPACE_DELEGATED_USER");
  const privateKey = optionalEnv("GOOGLE_WORKSPACE_PRIVATE_KEY");
  const keyless = process.env.GOOGLE_WORKSPACE_KEYLESS === "true";

  if (privateKey) {
    // Key-based: use service account JSON key (original behaviour)
    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes,
      subject: delegatedUser
    });

    const token = await auth.authorize();
    if (!token.access_token) {
      throw new Error("Failed to obtain Google Workspace access token.");
    }

    return token.access_token;
  }

  if (keyless) {
    // Keyless: use ADC + IAM signJwt (no private key needed)
    const adcAuth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/iam"]
    });
    const client = await adcAuth.getClient();
    const adcTokenRes = await client.getAccessToken();

    if (!adcTokenRes.token) {
      throw new Error(
        "GOOGLE_ADC_TOKEN_MISSING — run: gcloud auth application-default login"
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: clientEmail,
      sub: delegatedUser,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: scopes.join(" ")
    };

    const signRes = await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(clientEmail)}:signJwt`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adcTokenRes.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payload: JSON.stringify(claims) })
      }
    );

    if (!signRes.ok) {
      const body = await signRes.text();
      throw new Error(`signJwt failed (${signRes.status}): ${body}`);
    }

    const { signedJwt } = (await signRes.json()) as { signedJwt: string };

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
      throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`);
    }

    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) throw new Error("Google access token missing after exchange");
    return access_token;
  }

  throw new Error(
    "No Google Workspace auth configured.\n" +
      "Set GOOGLE_WORKSPACE_PRIVATE_KEY (key-based) OR set GOOGLE_WORKSPACE_KEYLESS=true (keyless via ADC)."
  );
}

async function googleJsonFetch<T>(url: string, init: RequestInit, scopes: string[]): Promise<T> {
  const accessToken = await getAccessToken(scopes);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google API request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function ensureAoOsStaffUserDoesNotExist(email: string): Promise<void> {
  const existing = await prisma.staffUser.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`AO OS staff user already exists for ${email}`);
  }
}

async function createAoOsStaffUser(input: {
  email: string;
  fullName: string;
  password: string;
  role: StaffRole;
}): Promise<{ id: string; email: string; fullName: string; role: StaffRole }> {
  const passwordHash = await bcrypt.hash(input.password, 10);

  const created = await prisma.staffUser.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      active: true
    }
  });

  return {
    id: created.id,
    email: created.email,
    fullName: created.fullName,
    role: created.role as StaffRole
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "primary-email": { type: "string" },
      "given-name": { type: "string" },
      "family-name": { type: "string" },
      password: { type: "string" },
      alias: { type: "string", multiple: true },
      "org-unit-path": { type: "string" },
      "recovery-email": { type: "string" },
      "change-password-at-next-login": { type: "boolean", default: true },
      "create-ao-staff-user": { type: "boolean", default: false },
      "ao-role": { type: "string" },
      help: { type: "boolean", short: "h" },
      "dry-run": { type: "boolean", default: false }
    },
    allowPositionals: false
  });

  if (values.help) {
    console.log(usage());
    return;
  }

  const primaryEmail = values["primary-email"]?.trim();
  const givenName = values["given-name"]?.trim();
  const familyName = values["family-name"]?.trim();
  const password = values.password?.trim();
  const aliases = (values.alias ?? []).map((alias) => alias.trim()).filter(Boolean);
  const orgUnitPath = values["org-unit-path"]?.trim() || "/";
  const recoveryEmail = values["recovery-email"]?.trim();
  const changePasswordAtNextLogin = values["change-password-at-next-login"] !== false;
  const createAoStaffUser = values["create-ao-staff-user"] === true;
  const aoRole = ensureValidRole(values["ao-role"]?.trim() || "front_desk");
  const isDryRun = values["dry-run"] === true;
  const fullName = `${givenName} ${familyName}`;

  if (!primaryEmail || !givenName || !familyName || !password) {
    throw new Error(`Missing required args.\n\n${usage()}`);
  }

  if (createAoStaffUser && !isDryRun) {
    requiredEnv("DATABASE_URL");
    await ensureAoOsStaffUserDoesNotExist(primaryEmail);
  }

  const userPayload = {
    primaryEmail,
    name: {
      givenName,
      familyName,
      fullName
    },
    password,
    orgUnitPath,
    changePasswordAtNextLogin,
    recoveryEmail
  };

  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          user: userPayload,
          aliases,
          aoOsStaffUser: createAoStaffUser
            ? {
                email: primaryEmail,
                fullName,
                role: aoRole,
                active: true
              }
            : null
        },
        null,
        2
      )
    );
    return;
  }

  const user = await googleJsonFetch<WorkspaceUserResponse>(
    "https://admin.googleapis.com/admin/directory/v1/users",
    {
      method: "POST",
      body: JSON.stringify(userPayload)
    },
    [
      "https://www.googleapis.com/auth/admin.directory.user",
      "https://www.googleapis.com/auth/admin.directory.user.alias"
    ]
  );

  for (const alias of aliases) {
    await googleJsonFetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(primaryEmail)}/aliases`,
      {
        method: "POST",
        body: JSON.stringify({ alias })
      },
      ["https://www.googleapis.com/auth/admin.directory.user.alias"]
    );
  }

  const aoOsStaffUser = createAoStaffUser
    ? await createAoOsStaffUser({
        email: primaryEmail,
        fullName,
        password,
        role: aoRole
      })
    : null;

  console.log(
    JSON.stringify(
      {
        createdUser: {
          id: user.id,
          primaryEmail: user.primaryEmail,
          fullName: user.name?.fullName ?? fullName
        },
        aliases,
        aoOsStaffUser
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});