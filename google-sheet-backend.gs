/**
 * Optional Google Sheet inbox.
 *
 * 1. Create a Google Sheet with a header row.
 * 2. Extensions → Apps Script, paste this file, Save.
 * 3. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the /exec URL into js/config.js → endpoint
 *
 * Parents then submit from the HTML form; each row is appended to the sheet.
 */
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = JSON.parse(e.postData.contents);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id", "submittedAt", "language", "studentName", "age", "gender", "parentName", "phone",
      "email", "school", "sport", "timesPerWeek", "slots", "firstChoice", "secondChoice",
      "tennisLevel", "padelLevel", "child2Name", "child2Age", "child2Gender", "child2Schedule", "notes"
    ]);
  }
  const id = "actp-" + Date.now();
  sheet.appendRow([
    id,
    new Date().toISOString(),
    data.language || "",
    data.studentName || "",
    data.age || "",
    data.gender || "",
    data.parentName || "",
    data.phone || "",
    data.email || "",
    data.school || "",
    data.sport || "",
    data.timesPerWeek || "",
    (data.slots || []).join(" | "),
    data.firstChoice || "",
    data.secondChoice || "",
    data.tennisLevel || "",
    data.padelLevel || "",
    data.child2Name || "",
    data.child2Age || "",
    data.child2Gender || "",
    data.child2Schedule || "",
    data.notes || ""
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, id: id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput("ACTP availability endpoint");
}
