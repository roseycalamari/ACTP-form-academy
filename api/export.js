const { verifySession } = require("../lib/auth");
const { readAll } = require("../lib/store");
const { toCsv, ofKind } = require("../lib/data");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }
  if (!verifySession(req.headers.cookie)) {
    res.status(401).send("Unauthorized");
    return;
  }
  try {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    const kind = url.searchParams.get("kind") || "academy";
    const items = ofKind(await readAll(), kind);
    const names = {
      academy: "actp-aulas.csv",
      social: "actp-social.csv",
      play: "actp-play-membership.csv"
    };
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=" + (names[kind] || "actp.csv"));
    res.status(200).send(toCsv(items));
  } catch (err) {
    res.status(err && err.code === "NO_STORE" ? 503 : 500).send("Error");
  }
};
