const { verifySession } = require("../lib/auth");
const { readAll, removeById } = require("../lib/store");
const { readJson } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (!verifySession(req.headers.cookie)) {
    res.status(401).json({ ok: false });
    return;
  }

  if (req.method === "GET") {
    try {
      const submissions = await readAll();
      res.status(200).json({ ok: true, submissions: submissions });
    } catch (err) {
      const status = err && err.code === "NO_STORE" ? 503 : 500;
      res.status(status).json({ ok: false, error: err && err.code === "NO_STORE" ? "NO_STORE" : "server" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const body = await readJson(req);
      const removed = await removeById(body && body.id);
      if (!removed) {
        res.status(404).json({ ok: false, error: "not found" });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      const status = err && err.code === "NO_STORE" ? 503 : 500;
      res.status(status).json({ ok: false, error: err && err.code === "NO_STORE" ? "NO_STORE" : "server" });
    }
    return;
  }

  res.status(405).json({ ok: false });
};
