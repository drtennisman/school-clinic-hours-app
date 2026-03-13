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


// ============================================================
// MONTHLY STAFFING REPORT
// ============================================================
// Generates a "Staffing Report - Month Year" tab in the same
// spreadsheet. Shows each staff member's total hours, rate,
// and total pay for the month, plus a grand total row.
//
// Run manually:  generateMonthlyReport()        → current month
//                generateLastMonthReport()       → previous month
//                generateReport(month, year)     → any month
//
// Or set up the automatic trigger (see below).
// ============================================================

function generateReport(monthOverride, yearOverride) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheets()[0]; // First sheet has the logged hours

  var now = new Date();
  var month = monthOverride || (now.getMonth() + 1);
  var year  = yearOverride  || now.getFullYear();

  var monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  var monthName = monthNames[month - 1] + ' ' + year;
  var tabName = 'Staffing Report - ' + monthName;

  // Read all data rows (skip header)
  var lastRow = dataSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data to report.');
    return;
  }

  var data = dataSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  // Columns: Date, Staff, Clinic, Hours, Rate, Total, Submitted

  // Filter to the target month
  var monthRows = [];
  for (var i = 0; i < data.length; i++) {
    var dateVal = data[i][0];
    var rowDate;

    // Handle both date objects and "YYYY-MM-DD" strings
    if (dateVal instanceof Date) {
      rowDate = dateVal;
    } else {
      var parts = String(dateVal).split('-');
      rowDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }

    if ((rowDate.getMonth() + 1) === month && rowDate.getFullYear() === year) {
      monthRows.push({
        date:  data[i][0],
        staff: data[i][1],
        clinic: data[i][2],
        hours: Number(data[i][3]),
        rate:  Number(data[i][4]),
        total: Number(data[i][5])
      });
    }
  }

  if (monthRows.length === 0) {
    Logger.log('No entries found for ' + monthName);
    return;
  }

  // Group by staff
  var staffMap = {};
  for (var j = 0; j < monthRows.length; j++) {
    var row = monthRows[j];
    if (!staffMap[row.staff]) {
      staffMap[row.staff] = { hours: 0, rate: row.rate, total: 0, sessions: 0 };
    }
    staffMap[row.staff].hours += row.hours;
    staffMap[row.staff].total += row.total;
    staffMap[row.staff].sessions += 1;
  }

  // Delete existing tab for this month if it exists
  var existing = ss.getSheetByName(tabName);
  if (existing) {
    ss.deleteSheet(existing);
  }

  // Create new report tab
  var report = ss.insertSheet(tabName);

  // Title
  report.getRange(1, 1).setValue('IJTA Staffing Report — ' + monthName);
  report.getRange(1, 1).setFontWeight('bold');
  report.getRange(1, 1).setFontSize(14);
  report.getRange(1, 1, 1, 5).merge();

  // Header row
  var headers = ['Staff', 'Sessions', 'Total Hours', 'Rate ($/hr)', 'Total Pay'];
  report.getRange(3, 1, 1, headers.length).setValues([headers]);
  report.getRange(3, 1, 1, headers.length).setFontWeight('bold');
  report.getRange(3, 1, 1, headers.length).setBackground('#052d54');
  report.getRange(3, 1, 1, headers.length).setFontColor('#ffffff');

  // Staff rows
  var staffNames = Object.keys(staffMap).sort();
  var currentRow = 4;
  var grandTotalHours = 0;
  var grandTotalPay = 0;

  for (var k = 0; k < staffNames.length; k++) {
    var name = staffNames[k];
    var info = staffMap[name];

    report.getRange(currentRow, 1).setValue(name);
    report.getRange(currentRow, 2).setValue(info.sessions);
    report.getRange(currentRow, 3).setValue(info.hours);
    report.getRange(currentRow, 4).setValue(info.rate);
    report.getRange(currentRow, 4).setNumberFormat('$#,##0.00');
    report.getRange(currentRow, 5).setValue(info.total);
    report.getRange(currentRow, 5).setNumberFormat('$#,##0.00');

    // Alternate row shading
    if (k % 2 === 0) {
      report.getRange(currentRow, 1, 1, 5).setBackground('#f0f4f8');
    }

    grandTotalHours += info.hours;
    grandTotalPay += info.total;
    currentRow++;
  }

  // Separator line
  currentRow++;

  // Grand total row
  report.getRange(currentRow, 1).setValue('TOTAL');
  report.getRange(currentRow, 1).setFontWeight('bold');
  report.getRange(currentRow, 3).setValue(grandTotalHours);
  report.getRange(currentRow, 3).setFontWeight('bold');
  report.getRange(currentRow, 5).setValue(grandTotalPay);
  report.getRange(currentRow, 5).setFontWeight('bold');
  report.getRange(currentRow, 5).setNumberFormat('$#,##0.00');
  report.getRange(currentRow, 1, 1, 5).setBackground('#e3edf7');

  // --- Detail section ---
  currentRow += 2;
  report.getRange(currentRow, 1).setValue('DETAIL — All Entries');
  report.getRange(currentRow, 1).setFontWeight('bold');
  report.getRange(currentRow, 1).setFontSize(12);
  currentRow++;

  var detailHeaders = ['Date', 'Staff', 'Clinic', 'Hours', 'Rate', 'Total'];
  report.getRange(currentRow, 1, 1, detailHeaders.length).setValues([detailHeaders]);
  report.getRange(currentRow, 1, 1, detailHeaders.length).setFontWeight('bold');
  report.getRange(currentRow, 1, 1, detailHeaders.length).setBackground('#052d54');
  report.getRange(currentRow, 1, 1, detailHeaders.length).setFontColor('#ffffff');
  currentRow++;

  // Sort detail rows by date, then staff
  monthRows.sort(function(a, b) {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.staff < b.staff) return -1;
    if (a.staff > b.staff) return 1;
    return 0;
  });

  for (var m = 0; m < monthRows.length; m++) {
    var entry = monthRows[m];
    report.getRange(currentRow, 1).setValue(entry.date);
    report.getRange(currentRow, 2).setValue(entry.staff);
    report.getRange(currentRow, 3).setValue(entry.clinic);
    report.getRange(currentRow, 4).setValue(entry.hours);
    report.getRange(currentRow, 5).setValue(entry.rate);
    report.getRange(currentRow, 5).setNumberFormat('$#,##0.00');
    report.getRange(currentRow, 6).setValue(entry.total);
    report.getRange(currentRow, 6).setNumberFormat('$#,##0.00');

    if (m % 2 === 0) {
      report.getRange(currentRow, 1, 1, 6).setBackground('#f0f4f8');
    }

    currentRow++;
  }

  // Auto-resize columns
  for (var c = 1; c <= 6; c++) {
    report.autoResizeColumn(c);
  }

  // Freeze header
  report.setFrozenRows(3);

  Logger.log('Staffing report generated for ' + monthName + ': ' +
    staffNames.length + ' staff, ' + grandTotalHours + ' hours, $' + grandTotalPay + ' total');
}


// Convenience: generate report for the current month
function generateMonthlyReport() {
  var now = new Date();
  generateReport(now.getMonth() + 1, now.getFullYear());
}

// Convenience: generate report for last month
function generateLastMonthReport() {
  var now = new Date();
  var month = now.getMonth(); // getMonth() is 0-indexed, so this gives last month
  var year = now.getFullYear();
  if (month === 0) {
    month = 12;
    year--;
  }
  generateReport(month, year);
}


// ============================================================
// AUTOMATIC MONTHLY TRIGGER
// ============================================================
// Run setupMonthlyTrigger() ONCE from the Apps Script editor.
// It will schedule generateLastMonthReport to run automatically
// on the 1st of every month between midnight and 1am.
// ============================================================

function setupMonthlyTrigger() {
  // Remove any existing clinic hours triggers first
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'generateLastMonthReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create a new monthly trigger — runs on the 1st of each month
  ScriptApp.newTrigger('generateLastMonthReport')
    .timeBased()
    .onMonthDay(1)
    .atHour(0)
    .create();

  Logger.log('Monthly trigger set up — staffing report will auto-generate on the 1st of each month');
}
