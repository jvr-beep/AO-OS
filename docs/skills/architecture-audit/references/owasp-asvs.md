# OWASP ASVS — audit reference (security deep-dive)

OWASP Application Security Verification Standard. 14 control chapters. Three levels:
- **L1:** Baseline. Every app should meet this.
- **L2:** Apps handling sensitive data. Most business applications.
- **L3:** High-assurance apps (financial, health, critical infrastructure).

For this audit, target **L2 unless the user says otherwise**. Flag L1 gaps as Critical. Flag L2 gaps as High. L3 gaps only surface if the app handles regulated data.

## Auditing approach

You will not verify all 14 chapters exhaustively. Prioritize these six — they catch 80% of real-world issues:

### V2 — Authentication
- Password storage: bcrypt / argon2 / scrypt. NOT SHA-256, NOT MD5, NOT plaintext.
- Password policy: length minimums, breach checks.
- MFA: available for privileged accounts at minimum.
- Session management: secure random tokens, HttpOnly + Secure cookies, proper expiry.
- Account lockout / rate limiting on auth endpoints.
- Password reset flows: token entropy, single-use, expiry.

### V3 — Session Management
- Session IDs not in URL.
- Logout actually invalidates the session server-side.
- Session fixation prevented (rotate session ID on login).
- Cookie flags: `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`.

### V4 — Access Control
- Authorization enforced **server-side** for every sensitive action. Client-side checks are UX, not security.
- Principle of least privilege — users/roles have only what they need.
- IDOR (Insecure Direct Object Reference): GET `/orders/12345` — does the server check the current user owns order 12345?
- Deny by default.

### V5 — Validation, Sanitization, Encoding
- Input validation — allow-list, not deny-list. Validate on the server.
- Output encoding — context-aware (HTML, JS, URL, CSS) to prevent XSS.
- Parameterized queries — no string concatenation into SQL.
- File upload: content-type validation, size limits, store outside web root, scan for malware.
- Deserialization: avoid deserializing untrusted data (especially pickle, Java serialization).

### V7 — Error Handling & Logging
- Errors don't leak stack traces, DB schema, file paths to clients.
- Security-relevant events logged: failed auth, authz denials, admin actions.
- Logs don't contain secrets, PII, or tokens.
- Logs immutable (append-only) for audit chain.

### V9 — Communications
- TLS 1.2+ (1.3 preferred). No SSLv3, no TLS 1.0/1.1.
- HSTS header on production.
- Certificate pinning for mobile apps (if applicable).
- Secure internal communication (mTLS or at minimum TLS, never plaintext inside VPC).

## Quick scan patterns

During the audit, grep for these red flags as fast evidence:

- `md5(` or `sha1(` + password → weak hashing
- `eval(` or `exec(` with user input → code injection
- `raw_input`, SQL string concat with `+` or template literals → SQL injection
- `innerHTML = ` with user data → XSS
- Hardcoded secrets: regex for `api_key`, `secret`, `password`, `token` in source
- `http://` (not https) in production endpoints
- `Access-Control-Allow-Origin: *` in auth-bearing endpoints
- `jwt.sign(...)` without expiration
- CSRF protection disabled in framework config

## Lesser-priority chapters (flag if trivially violated, don't exhaustively audit)

- V1 (Architecture) — covered by other frameworks in this skill
- V6 (Stored Cryptography) — audit only if the app rolls its own crypto (rare + usually wrong)
- V8 (Data Protection) — overlaps with V5
- V10 (Malicious Code) — supply chain; covered by dependency scanning in GCP Security pillar
- V11 (Business Logic) — case-by-case
- V12 (Files & Resources) — covered by V5 file upload
- V13 (API & Web Service) — REST vs. GraphQL specifics
- V14 (Configuration) — covered by GCP Operational Excellence

## Scoring

For each chapter audited: **Pass / Gap / Unknown**. Gap findings get the standard finding shape (see SKILL.md). Unknown means you couldn't verify without runtime access — surface these in "What I couldn't check."
