# Receive website leads in Google Sheets

Every "Get a free demo" form submission becomes a new row in your Google Sheet, and you get an optional email alert too. Setup takes about 10 minutes and it's free.

## 1. Create the sheet
1. Open **https://sheets.new** while signed in to the Google account you want to use.
2. Name it **CXR Digital Leads**.

## 2. Add the script
1. In the sheet, click **Extensions → Apps Script**.
2. Delete everything in the editor and paste the full contents of `apps-script.gs` (in this folder).
3. Optional: put your email in line 10 to get an alert for every lead:
   `const NOTIFY_EMAIL = 'you@gmail.com';`
4. Click **Save** (the disk icon).

## 3. Deploy it as a web app
1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** CXR leads
   - **Execute as:** Me
   - **Who has access:** Anyone *(this is needed so the website can send rows to the sheet; people still can't read your sheet)*
4. Click **Deploy**, then **Authorize access** and choose your Google account.
5. Google will warn *"Google hasn't verified this app"*. That's normal for your own script. Click **Advanced → Go to (project name) (unsafe) → Allow**.
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

## 4. Connect the website
Paste that URL into `GOOGLE_SHEET_URL` at the top of `app.js` (or send it to your developer).

## 5. Test
1. Open the Web app URL in your browser. You should see `"CXR Digital lead endpoint is running."`
2. Submit the form on your website.
3. A **Leads** tab appears in your sheet with the submission. If you set `NOTIFY_EMAIL`, check your inbox (and spam folder the first time).

## Managing leads
- The **Status** column starts as `New`. Change it to `Contacted`, `Demo sent`, `Won` or `Lost` to track your pipeline.
- Install the **Google Sheets app** on your phone to see leads on the go.

## If you edit the script later
Use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. This keeps the same URL. Creating a *new* deployment gives a different URL, which you'd then need to update on the website.
