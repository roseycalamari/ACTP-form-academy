const { checkPassword, signSession, sessionCookie } = require("../lib/auth");
const { readJson } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }
  const body = await readJson(req);
  if (!checkPassword(body.password)) {
    res.status(401).json({ ok: false });
    return;
  }
  const token = signSession();
  res.setHeader("Set-Cookie", sessionCookie(token));
  res.status(200).json({ ok: true });
};
