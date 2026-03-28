# How to Get a Valid JWT Token for N8N

Your N8N workflow needs a **JWT Bearer token** to authenticate against the AO OS API. Here's how to get one.

## Method 1: Get from Browser (Easiest)

### Step 1: Log into AO OS Web UI
```
http://localhost:3000
```

### Step 2: Open Browser Dev Tools
- **Windows**: Press `F12`
- **Mac**: Press `Cmd + Option + I`

### Step 3: Navigate to Application

Go to **Application** tab (or **Storage** in Firefox)

### Step 4: Find the JWT Token

1. Click **Cookies** (left sidebar)
2. Select `http://localhost:3000`
3. Look for a cookie named something like:
   - `auth_token`
   - `token`
   - `jwt` 
   - `accessToken`

4. Copy the **Value** (it's a long string starting with `ey...`)

### Step 5: Use in N8N

1. Go to N8N workflow
2. Find the **HTTP Request** node
3. Paste token in **Bearer Token** field
4. Test workflow

**Note**: This token may expire. If you get `401 Unauthorized` later, repeat these steps to get a fresh token.

---

## Method 2: Generate via API (More Permanent)

If your AO OS API has an auth endpoint, you can get a token programmatically.

### Check if Auth Endpoint Exists

```bash
# Try to authenticate against the production API
curl -X POST https://api.aosanctuary.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@ao-os.local",
    "password": "<your-staff-password>"
  }'

# Or against a local instance
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@ao-os.local",
    "password": "<your-staff-password>"
  }'
```

If that works, you'll get a response like:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { /* staff user info */ }
}
```

### Use in N8N (Set node)

Create a **Set** node *before* HTTP Request to fetch fresh token each time:

```javascript
{
  "token": $node["Auth Login"].json.accessToken
}
```

Then reference it in HTTP Request:
```
Bearer {{$node["Get Token"].json.token}}
```

---

## Method 3: Create Dedicated Service Account (Production)

For long-term stability, create a dedicated staff user for N8N:

1. Log into AO OS as **admin**
2. Go to **Staff** management page
3. Create new staff user:
   - Email: `n8n-service@ao-os.local`
   - Role: `operations` (or `admin`)
   - Password: Strong random password
4. Save credentials securely
5. Use that account to log in and get token

---

## Verify Token is Valid

Before using in N8N, test it manually:

```bash
TOKEN="<paste-your-token-here>"

curl -X GET http://localhost:4000/v1/events/poll \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected responses:**
- `200 OK` with JSON events → Token is valid ✓
- `401 Unauthorized` → Token expired, get a new one
- `403 Forbidden` → User role is not admin/operations

---

## Token Expiration

- **Short-lived tokens** (Method 1, 2): Expire in 1-24 hours
- **Solution for N8N**: 
  - Add a **Set** node that calls `/v1/auth/login` each run
  - Use fresh token each polling cycle
  - OR create an API key (if your backend supports it)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Token contains special characters | It's normal for JWT. Copy entire string. |
| "eyJ..." token starts with | That's correct format for JWT (base64 encoded) |
| N8N says "Invalid Bearer token" | Token expired. Get fresh one from browser or re-auth endpoint. |
| "Unauthorized" even with valid token | User doesn't have admin/operations role. Check staff user role. |
| Can't find auth endpoint | Check your API documentation or ask backend team. |

---
