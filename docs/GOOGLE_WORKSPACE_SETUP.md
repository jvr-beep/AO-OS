# Google Workspace Setup

This setup enables two capabilities:

1. Gmail API email sending for AO OS transactional email
2. Google Workspace user and alias provisioning from this repo
3. Optional AO OS staff-user creation in the same provisioning command
4. Workspace suspension sync when AO OS staff users are deactivated or reactivated

## Required Google-side setup

1. Create or choose a Google Cloud project for AO OS automation.
2. Enable these APIs in Google Cloud:
   - Gmail API
   - Admin SDK API
3. Create a service account in that project.
4. Enable Domain-wide Delegation on the service account.
5. In Google Workspace Admin Console, authorize that service account client ID under:
   - Security
   - Access and data control
   - API controls
   - Domain-wide delegation
6. Grant these OAuth scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/admin.directory.user`
   - `https://www.googleapis.com/auth/admin.directory.user.alias`
7. Choose a delegated admin mailbox that can send email and manage users.
8. Decide whether the API and provisioning script will use key-based auth or keyless auth.

## Auth modes

Two Google Workspace auth modes are supported.

### Option A: key-based

Set these env vars:

- `GOOGLE_WORKSPACE_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com`
- `GOOGLE_WORKSPACE_PRIVATE_KEY=<private-key-with-escaped-newlines>`
- `GOOGLE_WORKSPACE_DELEGATED_USER=<workspace-admin>@aosanctuary.com`

Notes:

- `GOOGLE_WORKSPACE_PRIVATE_KEY` should keep literal `\n` sequences in `.env` style files.
- This is the simplest local-dev and non-GCP-hosted deployment option.

### Option B: keyless

Set these env vars:

- `GOOGLE_WORKSPACE_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com`
- `GOOGLE_WORKSPACE_DELEGATED_USER=<workspace-admin>@aosanctuary.com`
- `GOOGLE_WORKSPACE_KEYLESS=true`

Requirements:

- The runtime identity must have Application Default Credentials available.
- That identity must be granted `roles/iam.serviceAccountTokenCreator` on the Workspace service account.
- The runtime must be able to call the IAM Credentials API to sign JWTs on behalf of the Workspace service account.

This mode avoids storing a long-lived private key in the AO OS runtime.

## API env vars

Set these on the AO OS API host:

- `EMAIL_PROVIDER=gmail`
- `EMAIL_FROM=AO OS <ops@aosanctuary.com>`
- `STAFF_APP_BASE_URL=https://ao-os.aosanctuary.com` if staff reset emails should point somewhere different from `APP_BASE_URL`
- `GOOGLE_WORKSPACE_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com`
- `GOOGLE_WORKSPACE_DELEGATED_USER=<workspace-admin>@aosanctuary.com`
- `GOOGLE_WORKSPACE_CUSTOMER_ID=my_customer`
- `GOOGLE_WORKSPACE_PRIVATE_KEY=<private-key-with-escaped-newlines>` for key-based auth only
- `GOOGLE_WORKSPACE_KEYLESS=true` for keyless auth only

Notes:

- The delegated user must exist in Workspace and have privileges to manage users and aliases.
- `EMAIL_FROM` should match the delegated user mailbox or a configured send-as alias.
- Gmail email delivery and Workspace provisioning share the same delegated Workspace auth path.
- Staff password reset emails now link to the staff login flow at `/login?resetToken=...` and use `STAFF_APP_BASE_URL` when provided.

## Provisioning command

Once the env vars are loaded in your shell, create a user and aliases with:

```bash
pnpm google-workspace:provision-user -- \
  --primary-email test.user@aosanctuary.com \
  --given-name Test \
  --family-name User \
  --password 'TempPass123!' \
  --alias qa.user@aosanctuary.com \
  --org-unit-path /Testing
```

Create both the Workspace user and the AO OS staff-user record:

```bash
pnpm google-workspace:provision-user -- \
   --primary-email test.user@aosanctuary.com \
   --given-name Test \
   --family-name User \
   --password 'TempPass123!' \
   --alias qa.user@aosanctuary.com \
   --create-ao-staff-user \
   --ao-role front_desk
```

That combined mode also requires `DATABASE_URL` in the shell environment so the script can write the AO OS `StaffUser` row.

The AO OS admin console also supports the same provisioning flow through the staff page. That path:

- creates the Workspace user for `@aosanctuary.com` staff emails
- optionally creates a Workspace alias
- creates the AO OS `staffUser` record
- stores audit metadata about the provisioning action

Dry run:

```bash
pnpm google-workspace:provision-user -- \
  --primary-email test.user@aosanctuary.com \
  --given-name Test \
  --family-name User \
  --password 'TempPass123!' \
  --dry-run
```

## Automated staff login and reset smoke

For Windows-driven smoke testing, use `scripts/test-staff-login-reset.ps1`.

This script can:

- test login for an existing AO OS staff user
- trigger `POST /v1/auth/staff-password-reset/request`
- optionally provision a new Workspace-backed user first
- optionally verify the reset/email lifecycle from remote API container logs over SSH

Existing staff user example:

```powershell
$password = ConvertTo-SecureString 'KnownPass123!' -AsPlainText -Force

powershell -ExecutionPolicy Bypass -File scripts/test-staff-login-reset.ps1 \
   -ApiBase https://api.aosanctuary.com \
   -WebBase https://ao-os.aosanctuary.com \
   -Email existing.staff@aosanctuary.com \
   -Password $password \
   -VerifyRemoteLogs \
   -HostName ao-os-api-gcp
```

Provision a new Workspace and AO OS staff user, then test it:

```powershell
$password = ConvertTo-SecureString 'TempPass123!' -AsPlainText -Force

powershell -ExecutionPolicy Bypass -File scripts/test-staff-login-reset.ps1 \
   -ApiBase https://api.aosanctuary.com \
   -WebBase https://ao-os.aosanctuary.com \
   -Email qa.reset.user@aosanctuary.com \
   -Password $password \
   -ProvisionWorkspaceUser \
   -GivenName QA \
   -FamilyName Reset \
   -CreateAoStaffUser \
   -AoRole front_desk \
   -VerifyRemoteLogs \
   -HostName ao-os-api-gcp
```

Notes:

- `-ApiBase` accepts either the host root or a `/v1` URL.
- Provisioning requires the same Google Workspace env vars documented above.
- `-CreateAoStaffUser` also requires `DATABASE_URL` in the local shell.
- Remote log verification checks for `staff_password_reset_requested`, `staff_password_reset_delivery_completed`, and `email_delivery_completed` for the masked target email.
- This proves AO OS accepted the request and handed the email off successfully, but it does not prove the target inbox received the message.

## Production rollout

1. Set the Gmail / Workspace env vars on the API host.
2. Restart or recreate the API container.
3. Sign in to the AO OS staff console as an admin.
4. Provision a test `@aosanctuary.com` staff account from the staff page.
5. Confirm the Workspace user exists and the AO OS staff record appears in the staff roster.
6. Trigger a staff password reset request from the login page.
7. Confirm delivery in the delegated Gmail mailbox sent mail and the target inbox.
8. Deactivate the test staff account and confirm the Workspace user becomes suspended.
9. Reactivate the test staff account and confirm the Workspace user is no longer suspended.

## Current behavior and limits

- It manages Workspace user creation, alias creation, and suspended state only for users in the `@aosanctuary.com` domain.
- It does not manage groups, licenses, OU moves after creation, or broader identity lifecycle workflows.
- It does not rotate service account keys.
- Alias creation retries automatically when Google returns the short post-create consistency error.
