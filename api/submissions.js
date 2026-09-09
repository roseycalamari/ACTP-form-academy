const { verifySession } = require("../lib/auth");
const { readAll } = require("../lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }
  if (!verifySession(req.headers.cookie)) {
    res.status(401).json({ ok: false });
    return;
  }
  try {
    const submissions = await readAll();
    res.status(200).json({ ok: true, submissions: submissions });
  } catch (err) {
    const status = err && err.code === "NO_STORE" ? 503 : 500;
    res.status(status).json({ ok: false, error: err && err.code === "NO_STORE" ? "NO_STORE" : "server" });
  }
};
