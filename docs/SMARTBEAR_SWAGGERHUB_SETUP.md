# SmartBear SwaggerHub Setup Guide

Connect AO OS to SmartBear SwaggerHub for API documentation, design review, and interactive testing — all driven from the repo-owned OpenAPI spec.

---

## Part A: Create a SwaggerHub Account

### Step 1: Sign Up

1. Go to [swaggerhub.com](https://app.swaggerhub.com)
2. Click **Sign Up Free**
3. Use your work email (or GitHub OAuth for faster setup)
4. Confirm your email if prompted

### Step 2: Create an Organization (Optional but Recommended)

1. After logging in, click your avatar → **Organizations**
2. Click **Create Organization**
3. Name: `ao-os` (or your team name)
4. This lets you share the API spec with teammates

---

## Part B: Import the AO OS OpenAPI Spec

The repo already has a spec file at `openapi/ao-os.openapi.yaml`. Import it directly.

### Step 1: Create a New API

1. In SwaggerHub, click **+ Create New** (top right)
2. Select **Create New API**
3. Fill in:
   - **Owner**: Select your org or personal account
   - **API Name**: `ao-os`
   - **Version**: `0.1.0`
   - **Template**: Select **Import YAML/JSON**

### Step 2: Paste the OpenAPI Spec

1. Open `openapi/ao-os.openapi.yaml` in your editor
2. Copy the entire contents
3. Paste into the SwaggerHub editor
4. Click **Create API**

SwaggerHub will validate the spec and display it in the visual editor.

### Step 3: Verify the Import

1. The left panel should show your API paths (once endpoints are added to the spec)
2. Click **Preview Docs** to see the rendered documentation
3. If the spec has errors, the editor will highlight them in red with line numbers

---

## Part C: Sync with GitHub (Recommended)

Keep SwaggerHub in sync with the repo so the spec stays up to date automatically.

### Step 1: Enable GitHub Integration in SwaggerHub

1. In your API view, click the **Integrations** tab (top of the editor)
2. Click **Add New Integration**
3. Select **GitHub**
4. Authorize SwaggerHub to access your GitHub account when prompted

### Step 2: Configure the Sync

Fill in the sync settings:

| Field | Value |
|-------|-------|
| **Name** | `AO-OS GitHub Sync` |
| **GitHub Owner** | `jvr-beep` |
| **Repository** | `AO-OS` |
| **Branch** | `main` |
| **Sync Method** | `GitHub to SwaggerHub` (repo is source of truth) |
| **Output File** | `openapi/ao-os.openapi.yaml` |

Click **Save**.

### Step 3: Test the Sync

1. Click **Execute** on the integration to do a one-time pull
2. SwaggerHub should reflect the current spec from the repo
3. Going forward, every push to `main` will auto-update SwaggerHub

---

## Part D: Use SwaggerHub to Test the API

SwaggerHub's **Try It Out** feature lets you send live requests to the running AO OS API.

### Step 1: Set the Server URL

1. In SwaggerHub editor, find (or add) the `servers` block in the spec:
   ```yaml
   servers:
     - url: http://localhost:4000/v1
       description: Local development
     - url: https://your-api.example.com/v1
       description: Production (use HTTPS for deployed environments)
   ```
2. Save the spec. SwaggerHub will show a server dropdown in the docs UI.

### Step 2: Authenticate

1. Click **Authorize** (lock icon, top right of the docs UI)
2. Enter your Bearer token in the `BearerAuth` field:
   ```
   Bearer <your-jwt-token>
   ```
   - See `docs/GET_JWT_TOKEN_FOR_N8N.md` if you need help getting a token
3. Click **Authorize**, then **Close**

### Step 3: Execute a Request

1. Find an endpoint in the left panel (e.g. `GET /health`)
2. Click it to expand
3. Click **Try it out**
4. Fill in any required parameters
5. Click **Execute**
6. The response body and status code appear below

> **Note**: SwaggerHub Try It Out requires the AO OS API to be running locally (`pnpm --filter api dev`) and CORS to allow the SwaggerHub origin, or you can use the Postman collection instead for local testing.

---

## Part E: Share API Documentation

### Generate a Public Docs Link

1. In your API view, click **Publish** (top right)
2. Toggle the version to **Published**
3. Click **View Published Docs** to get a shareable URL like:
   ```
   https://app.swaggerhub.com/apis/<owner>/ao-os/0.1.0
   ```
4. Share this URL with team members or stakeholders — no login required to view

### Export the Spec

To download the spec in other formats:

1. In SwaggerHub, click **Export** (top right menu)
2. Choose:
   - **Download API** → YAML or JSON (for Postman import or ReadyAPI)
   - **Download Resolved** → Spec with all `$ref` values inlined

---

## Part F: Update the OpenAPI Spec

As new endpoints are added to the AO OS API, keep the spec current.

### Adding a New Endpoint to the Spec

Edit `openapi/ao-os.openapi.yaml` in the repo. Example for a new `GET /members/:id` path:

```yaml
paths:
  /members/{id}:
    get:
      summary: Get member by ID
      operationId: getMember
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Member found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Member'
        '404':
          description: Member not found
```

After editing and pushing to `main`, the GitHub sync (Part C) will update SwaggerHub automatically.

---

## Part G: Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Import fails with YAML error | Spec has invalid syntax | Check indentation and run `npx @apidevtools/swagger-cli validate openapi/ao-os.openapi.yaml` |
| GitHub sync not triggering | Webhook not set up | Go to Integration settings → click **Execute** to re-sync manually |
| Try It Out gets CORS error | API not allowing SwaggerHub origin | Use Postman for local testing, or test against a deployed API URL |
| Spec not showing new paths | Spec file has `paths: {}` | Add endpoint definitions to `openapi/ao-os.openapi.yaml` |
| Unauthorized on Try It Out | JWT missing or expired | Click **Authorize** in the UI and paste a fresh token |
| Published docs not visible | API version still in Draft | Click **Publish** to move the version out of Draft state |

---

## Setup Checklist

- [ ] SwaggerHub account created
- [ ] Organization created (optional)
- [ ] New API created: `ao-os` version `0.1.0`
- [ ] `openapi/ao-os.openapi.yaml` contents imported
- [ ] GitHub integration configured (owner: `jvr-beep`, repo: `AO-OS`, branch: `main`)
- [ ] GitHub sync tested (Execute once manually)
- [ ] Server URL set to `http://localhost:4000/v1` (or deployed URL)
- [ ] Bearer token added via Authorize button
- [ ] At least one endpoint tested with Try It Out
- [ ] API version published (for shareable docs link)

---

## Related Docs

- `docs/GET_JWT_TOKEN_FOR_N8N.md` — How to obtain a valid JWT Bearer token
- `docs/N8N_CLOUD_NOTION_SETUP.md` — Connecting the events polling API to N8N and Notion
- `openapi/ao-os.openapi.yaml` — The OpenAPI spec file

---
