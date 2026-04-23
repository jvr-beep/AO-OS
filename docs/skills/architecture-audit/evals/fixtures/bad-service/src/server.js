const express = require("express");
const { Client } = require("pg");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// Hardcoded DB connection string with embedded credentials
const db = new Client({
  connectionString: "postgres://admin:hunter2@db.prod.internal:5432/app"
});
db.connect();

// Global in-memory session store (breaks horizontal scaling)
const sessions = {};

// Hardcoded JWT secret
const JWT_SECRET = "super-secret-jwt-signing-key-12345";

// CORS wildcard including credentials-bearing routes
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // SHA-1 password hashing
  const hash = crypto.createHash("sha1").update(password).digest("hex");

  // SQL injection via string concatenation
  const query = "SELECT id, email FROM users WHERE email = '" + email + "' AND password_hash = '" + hash + "'";
  const result = await db.query(query);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // No expiry on token
  const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET);
  sessions[token] = result.rows[0];

  // Non-HttpOnly cookie, no Secure flag, no SameSite
  res.cookie("token", token);
  res.json({ token, user: result.rows[0] });
});

app.get("/orders/:id", async (req, res) => {
  // IDOR: no authorization check — any authenticated user can read any order
  const order = await db.query("SELECT * FROM orders WHERE id = " + req.params.id);
  res.json(order.rows[0]);
});

app.post("/admin/run", (req, res) => {
  // Code injection via eval
  const result = eval(req.body.code);
  res.json({ result });
});

// No health endpoint
// No graceful shutdown
// No structured logging — uses console.log everywhere
console.log("starting server on 3000");
app.listen(3000);
