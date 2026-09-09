/**
 * On your Mac, submissions live in data/submissions.json.
 * On Vercel there is no lasting disk — connect Upstash Redis:
 *
 *   Vercel project → Storage → Marketplace → Upstash Redis (free) →
 *   Create database → Connect to this project → Redeploy
 *
 * Env vars used (any pair works):
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   KV_REST_API_URL + KV_REST_API_TOKEN
 */
const fs = require("fs");
const path = require("path");

const KEY = "actp:submissions";
const FILE = path.join(process.cwd(), "data", "submissions.json");

function restUrl() {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
}

function restToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
}

function hasStore() {
  return Boolean(restUrl() && restToken());
}

function productionNeedsStore() {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
}

async function kvCommand(command) {
  const res = await fetch(restUrl(), {
    method: "POST",
    headers: {
      Authorization: "Bearer " + restToken(),
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
  if (hasStore()) {
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
  if (productionNeedsStore()) {
    const err = new Error("NO_STORE");
    err.code = "NO_STORE";
    throw err;
  }
  return readFileStore();
}

async function writeAll(items) {
  if (hasStore()) {
    await kvCommand(["SET", KEY, JSON.stringify(items)]);
    return;
  }
  if (productionNeedsStore()) {
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

module.exports = { readAll, writeAll, append, hasStore, hasKv: hasStore };
