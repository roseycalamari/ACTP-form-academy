function readJson(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    if (typeof req.body === "string") {
      try {
        resolve(JSON.parse(req.body || "{}"));
      } catch (e) {
        reject(e);
      }
      return;
    }
    const chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = { readJson };
