const crypto = require("crypto");

const ADMIN_PASSWORD = process.env.ACTP_ADMIN_PASSWORD || "adminruben";

function signSession() {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", ADMIN_PASSWORD).update(payload).digest("hex");
  return payload + "." + sig;
}

function checkPassword(password) {
  const a = Buffer.from(String(password || ""));
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifySession(cookieHeader) {
  const cookies = {};
  String(cookieHeader || "").split(";").forEach(function (part) {
    const i = part.indexOf("=");
    if (i > -1) cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  const token = cookies.actp_session;
  if (!token || token.indexOf(".") < 0) return false;
  const parts = token.split(".");
  const payload = parts[0];
  const sig = parts[1];
  const expected = crypto.createHmac("sha256", ADMIN_PASSWORD).update(payload).digest("hex");
  if (expected.length !== sig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Date.now() < Number(data.exp);
  } catch (e) {
    return false;
  }
}

function sessionCookie(token) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return "actp_session=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800" + secure;
}

module.exports = {
  ADMIN_PASSWORD,
  checkPassword,
  signSession,
  verifySession,
  sessionCookie
};
