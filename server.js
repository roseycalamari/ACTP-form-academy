#!/usr/bin/env node
/**
 * ACTP parent availability — local inbox.
 *
 *   node server.js
 *   open http://localhost:3456
 *   admin: http://localhost:3456/admin
 *
 * Change the admin password:
 *   ACTP_ADMIN_PASSWORD='your-password' node server.js
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "submissions.json");
const CSV_FILE = path.join(DATA_DIR, "submissions.csv");
const PORT = Number(process.env.PORT || 3456);
const ADMIN_PASSWORD = process.env.ACTP_ADMIN_PASSWORD || "pinecliffs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const sessions = new Set();
const CSV_HEADERS = [
  "id", "submittedAt", "language", "studentName", "age", "parentName", "phone",
  "email", "school", "sport", "timesPerWeek", "slots", "firstChoice", "secondChoice",
  "tennisLevel", "padelLevel", "child2Name", "child2Age", "child2Schedule", "notes"
];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]\n", "utf8");
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function csvEscape(value) {
  const s = String(value == null ? "" : value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsvRow(row) {
  return CSV_HEADERS.map(function (key) {
    const value = key === "slots" && Array.isArray(row.slots) ? row.slots.join("|") : row[key];
    return csvEscape(value);
  }).join(",");
}

function writeAll(items) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2) + "\n", "utf8");
  const csv = "\uFEFF" + CSV_HEADERS.join(",") + "\n" + items.map(toCsvRow).join("\n") + "\n";
  fs.writeFileSync(CSV_FILE, csv, "utf8");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach(function (part) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  return Boolean(cookies.actp_session && sessions.has(cookies.actp_session));
}

function send(res, status, body, headers) {
  const extra = headers || {};
  extra["Cache-Control"] = extra["Cache-Control"] || "no-store";
  res.writeHead(status, extra);
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel === "/") rel = "/index.html";
  if (rel === "/admin") rel = "/admin.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, "Not found");
  const ext = path.extname(file);
  send(res, 200, fs.readFileSync(file), { "Content-Type": MIME[ext] || "application/octet-stream" });
}

function sanitize(data) {
  const str = function (v, max) {
    return String(v == null ? "" : v).trim().slice(0, max || 200);
  };
  const slots = Array.isArray(data.slots)
    ? data.slots.map(function (s) { return str(s, 20); }).filter(Boolean).slice(0, 25)
    : [];
  return {
    language: str(data.language, 8),
    studentName: str(data.studentName, 120),
    age: str(data.age, 8),
    parentName: str(data.parentName, 120),
    phone: str(data.phone, 40),
    email: str(data.email, 120),
    school: str(data.school, 120),
    sport: str(data.sport, 20),
    timesPerWeek: str(data.timesPerWeek, 20),
    slots: slots,
    firstChoice: str(data.firstChoice, 20),
    secondChoice: str(data.secondChoice, 20),
    tennisLevel: str(data.tennisLevel, 20),
    padelLevel: str(data.padelLevel, 20),
    child2Name: str(data.child2Name, 120),
    child2Age: str(data.child2Age, 8),
    child2Schedule: str(data.child2Schedule, 20),
    notes: str(data.notes, 2000),
    confirmed: Boolean(data.confirmed)
  };
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const p = url.pathname;

  try {
    if (req.method === "POST" && p === "/api/login") {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (String(body.password || "") !== ADMIN_PASSWORD) {
        return sendJson(res, 401, { ok: false });
      }
      const token = crypto.randomBytes(24).toString("hex");
      sessions.add(token);
      return send(res, 200, JSON.stringify({ ok: true }), {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": "actp_session=" + token + "; HttpOnly; SameSite=Lax; Path=/"
      });
    }

    if (req.method === "POST" && p === "/api/submit") {
      const raw = JSON.parse((await readBody(req)) || "{}");
      if (raw.website) return sendJson(res, 200, { ok: true, id: "ignored" });
      const row = sanitize(raw);
      if (!row.studentName || !row.parentName || !row.phone || !row.sport || !row.slots.length) {
        return sendJson(res, 400, { ok: false, error: "missing fields" });
      }
      const items = readAll();
      const saved = {
        id: "actp-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex"),
        submittedAt: new Date().toISOString(),
        ...row
      };
      items.push(saved);
      writeAll(items);
      return sendJson(res, 200, { ok: true, id: saved.id });
    }

    if (req.method === "GET" && p === "/api/submissions") {
      if (!isAdmin(req)) return sendJson(res, 401, { ok: false });
      return sendJson(res, 200, { ok: true, submissions: readAll() });
    }

    if (req.method === "GET" && p === "/api/export.csv") {
      if (!isAdmin(req)) return send(res, 401, "Unauthorized");
      ensureStore();
      const csv = fs.existsSync(CSV_FILE)
        ? fs.readFileSync(CSV_FILE)
        : Buffer.from("\uFEFF" + CSV_HEADERS.join(",") + "\n");
      return send(res, 200, csv, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=actp-disponibilidade.csv"
      });
    }

    if (req.method === "GET") return serveStatic(req, res, p);
    send(res, 405, "Method not allowed");
  } catch (err) {
    sendJson(res, 500, { ok: false, error: "server" });
  }
});

ensureStore();
server.listen(PORT, function () {
  console.log("ACTP availability form:  http://localhost:" + PORT);
  console.log("Team inbox:              http://localhost:" + PORT + "/admin");
  console.log("Admin password:          " + (process.env.ACTP_ADMIN_PASSWORD ? "(from ACTP_ADMIN_PASSWORD)" : "pinecliffs"));
  console.log("Saved to:                " + DATA_FILE);
});
