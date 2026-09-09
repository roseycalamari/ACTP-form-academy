const { verifySession } = require("../lib/auth");
const { readAll } = require("../lib/store");
const { toCsv } = require("../lib/data");

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
    const csv = toCsv(await readAll());
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=actp-disponibilidade.csv");
    res.status(200).send(csv);
  } catch (err) {
    res.status(err && err.code === "NO_STORE" ? 503 : 500).send("Error");
  }
};
