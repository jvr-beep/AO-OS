# AO OS Auth Verification (Postman)

Purpose: verify JWT auth end-to-end for the current AO OS backend.

## Base Setup

Set Postman environment variables:

- `baseUrl` = `http://localhost:4000/v1`
- `authEmail` = your staff user email
- `authPassword` = your staff user password

Optional test data variables (for protected route test):

- `memberId` = an existing member ID
- `locationId` = an existing location ID

## How staff users are created right now

Current implementation seeds an admin user at app startup when env vars are set:

- `AUTH_SEED_ADMIN_EMAIL`
- `AUTH_SEED_ADMIN_PASSWORD`
- `AUTH_SEED_ADMIN_NAME` (optional)

If login fails with invalid credentials, verify those env vars and restart the API.

---

## Flow 1: Login and obtain token

Request:

- Method: `POST`
- URL: `{{baseUrl}}/auth/login`
- Body:

```json
{
  "email": "{{authEmail}}",
  "password": "{{authPassword}}"
}
```

Expected:

- HTTP `201`
- Response contains `accessToken`
- Response contains `staffUser` with `id`, `email`, `fullName`, `role`

Postman Tests:

```javascript
pm.test("Login returns 201", function () {
  pm.response.to.have.status(201);
});

const body = pm.response.json();

pm.test("Login returns token and staff user", function () {
  pm.expect(body.accessToken).to.be.a("string").and.not.empty;
  pm.expect(body.staffUser).to.be.an("object");
  pm.expect(body.staffUser.email).to.be.a("string");
  pm.expect(body.staffUser.role).to.be.oneOf(["front_desk", "operations", "admin"]);
});

pm.environment.set("token", body.accessToken);
pm.environment.set("staffRole", body.staffUser.role);
```

---

## Flow 2: Authorized protected request

Use a protected route that all staff roles can access.

Request:

- Method: `POST`
- URL: `{{baseUrl}}/visit-sessions/check-in`
- Headers:
  - `Authorization: Bearer {{token}}`
- Body:

```json
{
  "memberId": "{{memberId}}",
  "locationId": "{{locationId}}",
  "checkInAt": "{{$isoTimestamp}}"
}
```

Expected:

- Not `401`
- If payload and domain state are valid, typically `201`
- If business rules fail (for example duplicate check-in), should be business denial (not auth denial)

Postman Tests:

```javascript
pm.test("Authorized request is not 401", function () {
  pm.expect(pm.response.code).to.not.eql(401);
});

if (pm.response.code === 201) {
  const body = pm.response.json();
  if (body.id) {
    pm.environment.set("visitSessionId", body.id);
  }
}
```

---

## Flow 3: Missing token should fail

Repeat the same protected request as Flow 2 but remove Authorization header.

Expected:

- HTTP `401 Unauthorized`

Postman Tests:

```javascript
pm.test("Missing token returns 401", function () {
  pm.response.to.have.status(401);
});
```

---

## Flow 4: Invalid token should fail

Use a bad token:

- `Authorization: Bearer invalid.token.value`

Expected:

- HTTP `401 Unauthorized`

Postman Tests:

```javascript
pm.test("Invalid token returns 401", function () {
  pm.response.to.have.status(401);
});
```

---

## Flow 5: Role-based 403 check

Use an endpoint restricted to `operations` or `admin`:

- `POST {{baseUrl}}/membership-plans`
- or `POST {{baseUrl}}/wristbands`

If your logged-in role is `front_desk`, expect `403`.
If your role is `operations` or `admin`, expect auth pass (not 401/403) and normal business validation.

Example request:

- Method: `POST`
- URL: `{{baseUrl}}/membership-plans`
- Headers:
  - `Authorization: Bearer {{token}}`
- Body:

```json
{
  "code": "AUTH-TEST-PLAN",
  "name": "Auth Test Plan",
  "description": "Role guard test",
  "tierRank": 99,
  "billingInterval": "month",
  "priceAmount": 9.99,
  "currency": "USD",
  "active": true
}
```

Postman Tests:

```javascript
const role = pm.environment.get("staffRole");

if (role === "front_desk") {
  pm.test("front_desk is forbidden on admin route", function () {
    pm.response.to.have.status(403);
  });
} else {
  pm.test("operations/admin are not blocked by role guard", function () {
    pm.expect([400, 401, 403, 201]).to.include(pm.response.code);
    pm.expect(pm.response.code).to.not.eql(401);
    pm.expect(pm.response.code).to.not.eql(403);
  });
}
```

---

## Current Protected Routes

JWT + role guard currently applied to:

- `POST /members`
- `POST /membership-plans`
- `POST /subscriptions`
- `POST /wristbands`
- `POST /wristbands/assign`
- `POST /wristbands/unassign`
- `POST /visit-sessions/check-in`
- `POST /visit-sessions/check-out`
- `POST /access-attempts`
- `POST /presence-events`

Read endpoints (`GET`) are currently open.

## Minimal Proof of Auth Working

1. Login succeeds and returns `accessToken`
2. Protected request with token is not `401`
3. Same protected request without token is `401`
4. Optional: restricted route returns `403` for `front_desk`

That sequence proves authentication and authorization are both wired.
