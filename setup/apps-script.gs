/**
 * CXR Digital - website leads -> Google Sheets (+ optional email alert)
 *
 * Paste this into Extensions > Apps Script in your Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 */

// Optional: your email to get an instant alert for every new lead.
// Leave as '' to only save to the sheet.
const NOTIFY_EMAIL = '';

const SHEET_NAME = 'Leads';
const HEADERS = ['Timestamp', 'Name', 'Business', 'Email', 'Phone', 'Industry', 'Plan', 'Website', 'Message', 'Page', 'Status'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const p = (e && e.parameter) || {};

    // Spam trap: real visitors never fill this hidden field.
    if (p.company_hp) return json({ ok: true });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1f7bff').setFontColor('#ffffff');
    }

    // Trim long values and stop anything that looks like a spreadsheet formula.
    const clean = (v) => String(v || '').slice(0, 2000).replace(/^[=+\-@]/, "'$&");
    const row = [
      new Date(), clean(p.name), clean(p.business), clean(p.email), clean(p.phone),
      clean(p.industry), clean(p.plan), clean(p.website), clean(p.message), clean(p.page), 'New'
    ];
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      const lines = HEADERS.slice(1, 10).map((h, i) => h + ': ' + (String(row[i + 1] || '-').replace(/^'/, '')));
      const mail = {
        to: NOTIFY_EMAIL,
        subject: 'New demo request: ' + (row[2] || row[1] || 'Website lead'),
        body: lines.join('\n') + '\n\nOpen your leads sheet: ' + ss.getUrl()
      };
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) mail.replyTo = p.email;
      MailApp.sendEmail(mail);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you open the Web app URL in a browser to check it's live.
function doGet() {
  return json({ ok: true, message: 'CXR Digital lead endpoint is running.' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
