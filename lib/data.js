const crypto = require("crypto");

const CSV_HEADERS = [
  "id", "submittedAt", "language", "studentName", "age", "gender", "parentName", "phone",
  "email", "school", "sport", "timesPerWeek", "slots", "firstChoice", "secondChoice",
  "tennisLevel", "padelLevel", "child2Name", "child2Age", "child2Gender", "child2Schedule", "notes"
];

function str(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 200);
}

function sanitize(data) {
  const slots = Array.isArray(data.slots)
    ? data.slots.map(function (s) { return str(s, 20); }).filter(Boolean).slice(0, 25)
    : [];
  return {
    language: str(data.language, 8),
    studentName: str(data.studentName, 120),
    age: str(data.age, 8),
    gender: str(data.gender, 8) === "boy" ? "boy" : (str(data.gender, 8) === "girl" ? "girl" : ""),
    parentName: str(data.parentName, 120),
    phone: str(data.phone, 40),
    email: str(data.email, 120),
    school: str(data.school, 120),
    sport: str(data.sport, 20),
    timesPerWeek: str(data.timesPerWeek, 20),
    slots: slots,
    firstChoice: str(data.firstChoice, 20),
    secondChoice: str(data.secondChoice, 20),
    tennisLevel: str(data.tennisLevel, 20),
    padelLevel: str(data.padelLevel, 20),
    child2Name: str(data.child2Name, 120),
    child2Age: str(data.child2Age, 8),
    child2Gender: str(data.child2Gender, 8) === "boy" ? "boy" : (str(data.child2Gender, 8) === "girl" ? "girl" : ""),
    child2Schedule: str(data.child2Schedule, 20),
    notes: str(data.notes, 2000),
    confirmed: Boolean(data.confirmed)
  };
}

function newRow(data) {
  return {
    id: "actp-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex"),
    submittedAt: new Date().toISOString(),
    ...sanitize(data)
  };
}

function csvEscape(value) {
  const s = String(value == null ? "" : value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(items) {
  const lines = items.map(function (row) {
    return CSV_HEADERS.map(function (key) {
      const value = key === "slots" && Array.isArray(row.slots) ? row.slots.join("|") : row[key];
      return csvEscape(value);
    }).join(",");
  });
  return "\uFEFF" + CSV_HEADERS.join(",") + "\n" + lines.join("\n") + "\n";
}

module.exports = { CSV_HEADERS, sanitize, newRow, toCsv };
