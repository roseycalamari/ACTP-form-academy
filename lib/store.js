/**
 * On your Mac, submissions live in data/submissions.json.
 * On Vercel there is no lasting disk — use Vercel KV (Upstash Redis).
 *
 * Vercel → Storage → Create KV Database → Connect to this project → Redeploy.
 * That sets KV_REST_API_URL and KV_REST_API_TOKEN.
 */
const fs = require("fs");
const path = require("path");

const KEY = "actp:submissions";
const FILE = path.join(process.cwd(), "data", "submissions.json");

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function productionNeedsKv() {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
}

async function kvCommand(command) {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.KV_REST_API_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("kv " + res.status + " " + text);
  }
  return res.json();
}

function readFileStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeFileStore(items) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + "\n", "utf8");
}

async function readAll() {
  if (hasKv()) {
    const result = await kvCommand(["GET", KEY]);
    const raw = result && result.result;
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  if (productionNeedsKv()) {
    const err = new Error("NO_STORE");
    err.code = "NO_STORE";
    throw err;
  }
  return readFileStore();
}

async function writeAll(items) {
  if (hasKv()) {
    await kvCommand(["SET", KEY, JSON.stringify(items)]);
    return;
  }
  if (productionNeedsKv()) {
    const err = new Error("NO_STORE");
    err.code = "NO_STORE";
    throw err;
  }
  writeFileStore(items);
}

async function append(row) {
  const items = await readAll();
  items.push(row);
  await writeAll(items);
  return row;
}

module.exports = { readAll, writeAll, append, hasKv };
