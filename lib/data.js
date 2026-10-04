const crypto = require("crypto");

const CSV_HEADERS = [
  "id", "submittedAt", "kind", "language", "studentName", "age", "gender", "parentName", "phone",
  "email", "school", "sport", "timesPerWeek", "slots", "firstChoice", "secondChoice",
  "tennisLevel", "padelLevel", "child2Name", "child2Age", "child2Gender", "child2Schedule",
  "weekendDays", "weekendWhen", "playPlan", "playSports", "playsAlready", "referredBy", "notes"
];

const ADULT_TIMES = ["1830", "1930", "2030"];
const DAYS = ["mon", "tue", "wed", "thu", "fri"];

function str(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max || 200);
}

function genderVal(v) {
  const g = str(v, 12);
  if (g === "boy" || g === "girl" || g === "male" || g === "female") return g;
  return "";
}

function adultSlots(slots) {
  return slots.filter(function (s) {
    const parts = String(s).split("-");
    return DAYS.indexOf(parts[0]) >= 0 && ADULT_TIMES.indexOf(parts[1]) >= 0;
  });
}

function list(value, allowed, max) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return raw.map(function (s) { return str(s, 20); })
    .filter(function (s) { return allowed.indexOf(s) >= 0; })
    .slice(0, max || 10);
}

function sanitize(data) {
  const kind = str(data.kind, 20);
  const safeKind = kind === "social" || kind === "play" || kind === "adults" ? kind : "academy";
  let slots = Array.isArray(data.slots)
    ? data.slots.map(function (s) { return str(s, 20); }).filter(Boolean).slice(0, 25)
    : [];
  if (safeKind === "adults") slots = adultSlots(slots);
  const firstChoice = safeKind === "adults" ? (adultSlots([str(data.firstChoice, 20)])[0] || "") : str(data.firstChoice, 20);
  const secondChoice = safeKind === "adults" ? (adultSlots([str(data.secondChoice, 20)])[0] || "") : str(data.secondChoice, 20);
  return {
    kind: safeKind,
    language: str(data.language, 8),
    studentName: str(data.studentName, 120),
    age: str(data.age, 8),
    gender: genderVal(data.gender),
    parentName: str(data.parentName, 120),
    phone: str(data.phone, 40),
    email: str(data.email, 120),
    school: str(data.school, 120),
    sport: str(data.sport, 20),
    timesPerWeek: str(data.timesPerWeek, 20),
    slots: slots,
    firstChoice: firstChoice,
    secondChoice: secondChoice,
    tennisLevel: str(data.tennisLevel, 20),
    padelLevel: str(data.padelLevel, 20),
    child2Name: str(data.child2Name, 120),
    child2Age: str(data.child2Age, 8),
    child2Gender: str(data.child2Gender, 8) === "boy" ? "boy" : (str(data.child2Gender, 8) === "girl" ? "girl" : ""),
    child2Schedule: str(data.child2Schedule, 20),
    weekendDays: list(data.weekendDays, ["sat", "sun"], 2),
    weekendWhen: str(data.weekendWhen, 20),
    playPlan: str(data.playPlan, 20),
    playSports: str(data.playSports, 20) || (kind === "play" ? str(data.sport, 20) : ""),
    playsAlready: Boolean(data.playsAlready),
    referredBy: str(data.referredBy, 160),
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

function isComplete(row) {
  if (!row.studentName || !row.phone) return false;
  if (row.kind === "social") return Boolean(row.sport && row.weekendDays && row.weekendDays.length);
  if (row.kind === "play") return Boolean(row.playPlan && row.sport);
  if (row.kind === "adults") return Boolean(row.gender && row.sport && row.slots && row.slots.length);
  return Boolean(row.parentName && row.sport && row.slots && row.slots.length);
}

function csvEscape(value) {
  const s = String(value == null ? "" : value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(items) {
  const lines = items.map(function (row) {
    return CSV_HEADERS.map(function (key) {
      let value = row[key];
      if ((key === "slots" || key === "weekendDays") && Array.isArray(value)) value = value.join("|");
      return csvEscape(value);
    }).join(",");
  });
  return "\uFEFF" + CSV_HEADERS.join(",") + "\n" + lines.join("\n") + "\n";
}

function ofKind(items, kind) {
  return (items || []).filter(function (row) {
    const k = row.kind || "academy";
    return k === kind;
  });
}

module.exports = { CSV_HEADERS, sanitize, newRow, isComplete, toCsv, ofKind };
