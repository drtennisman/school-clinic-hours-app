/**
 * IJTA Clinic Hours — Google Apps Script
 *
 * Deploy as a Web App:
 *   1. Create a new Google Sheet for clinic hours logging.
 *   2. Open Extensions > Apps Script and paste this code.
 *   3. Add a header row in Sheet1: Date | Staff | Clinic | Hours | Rate | Total | Submitted
 *   4. Deploy > New deployment > Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Copy the Web App URL and paste it into the app on first use.
 *
 * Each form submission appends one row to the sheet.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Ensure header row exists
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Staff', 'Clinic', 'Hours', 'Rate', 'Total', 'Submitted']);
    }

    // Append the entry
    sheet.appendRow([
      data.date,
      data.staff,
      data.clinic,
      data.hours,
      data.rate,
      data.total,
      new Date().toISOString()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: GET handler to verify the script is deployed
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Clinic Hours script is active.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
