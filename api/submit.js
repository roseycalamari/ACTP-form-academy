const { newRow } = require("../lib/data");
const { append } = require("../lib/store");
const { readJson } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }
  try {
    const raw = await readJson(req);
    if (raw.website) {
      res.status(200).json({ ok: true, id: "ignored" });
      return;
    }
    const saved = newRow(raw);
    if (!saved.studentName || !saved.parentName || !saved.phone || !saved.sport || !saved.slots.length) {
      res.status(400).json({ ok: false, error: "missing fields" });
      return;
    }
    await append(saved);
    res.status(200).json({ ok: true, id: saved.id });
  } catch (err) {
    const status = err && err.code === "NO_STORE" ? 503 : 500;
    res.status(status).json({ ok: false, error: err && err.code === "NO_STORE" ? "NO_STORE" : "server" });
  }
};
