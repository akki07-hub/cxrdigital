/**
 * CXR Digital - website backend (Google Apps Script)
 *
 *  1. Leads:   "Get a free demo" form -> "Leads" sheet (+ optional email alert)
 *  2. AI chat: website chat widget -> Claude (Anthropic API) -> reply
 *
 * The Anthropic API key is NOT in this file. Add it in
 * Project Settings > Script Properties as ANTHROPIC_API_KEY.
 *
 * After editing, redeploy with Deploy > Manage deployments > Edit (pencil)
 * > Version: New version > Deploy. This keeps the same web app URL.
 */

// ---------- Settings ----------
const NOTIFY_EMAIL = '';           // your email for lead alerts ('' = sheet only)

const AI_MODEL = 'claude-opus-5-5';
const AI_EFFORT = 'low';           // low = fast, cheap replies for chat
const AI_MAX_TOKENS = 2000;        // hard cap per reply (cost control)
const MAX_USER_MESSAGE_CHARS = 800;
const MAX_HISTORY_MESSAGES = 24;   // 12 back-and-forths per conversation
const MAX_CHATS_PER_MINUTE = 20;   // across all visitors
const MAX_CHATS_PER_DAY = 300;     // across all visitors (daily cost ceiling)
const MAX_CHATS_PER_SESSION = 15;  // per visitor conversation

const SHEET_NAME = 'Leads';
const HEADERS = ['Timestamp', 'Name', 'Business', 'Email', 'Phone', 'Industry', 'Plan', 'Website', 'Message', 'Page', 'Status'];

// ---------- Router ----------
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'chat') return handleChat(p);
  return handleLead(p);
}

function doGet() {
  return json({ ok: true, message: 'CXR Digital lead endpoint is running.' });
}

// ---------- 1. Leads ----------
function handleLead(p) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
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

// ---------- 2. AI chat ----------
const SYSTEM_PROMPT = `You are the friendly website assistant for CXR Digital ("Build Smart. Grow Digital."), a small web design studio. You chat with business owners visiting the CXR Digital website. Your goal is to answer their questions honestly and, when it fits, invite them to request a free demo.

How to reply:
- Keep replies short: usually 2-4 sentences. Use a short "- " bullet list only when listing several items.
- Plain text only. No headings, no bold, no tables.
- Reply in the same language the visitor writes in.
- Only state facts from the information below. If you don't know something (for example a specific integration or a custom quote), say so and suggest the free demo form or an Instagram DM.
- Never invent discounts, guarantees, client names, reviews or results. CXR Digital is a young studio; its portfolio is the live demo sites listed below, which are fictional businesses built to show what is possible.
- Don't promise exact prices for custom work; give the package prices and say the final quote comes after the free demo.
- If someone asks about something unrelated to websites or CXR Digital, answer briefly if harmless and steer back to how CXR Digital can help.
- If a visitor wants to start, tell them to use the "Get a free demo" form on this page (it's in the Contact section) or DM @cxrdigital on Instagram. You cannot book meetings, send emails or see their details yourself.

About CXR Digital:
- Builds fast, modern, mobile-first websites for small businesses: dental and medical clinics, salons and spas, plumbers and other trades, gyms, real estate agents, restaurants and more.
- Works with clients in the USA, UK, UAE and India, remotely, across time zones.
- Hand-coded sites (no bloated page builders) that load in about a second. The client owns everything: code, domain and content. No lock-in.

Services:
- Business websites (custom design, mobile-first)
- Online booking systems (appointments, tours, quotes, 24/7)
- AI chat assistants that answer FAQs, prices and hours and guide visitors to book
- Smart tools: price estimators, insurance checkers, mortgage calculators, quizzes
- Lead capture: forms that send enquiries straight to the owner's inbox or a Google Sheet
- SEO basics and Google Business Profile setup

Pricing (one-time; 50% to start, 50% at launch):
- Starter: $349 / £279 / AED 1,299 / ₹14,999. 1-page site (up to 6 sections), custom mobile-first design, contact form and WhatsApp button, Google Maps and basic SEO. Delivered in about 5 days.
- Growth (most popular): $749 / £599 / AED 2,749 / ₹29,999. Up to 5 pages or a long-scroll site, online booking system, AI chat assistant, 1 smart tool, Google Business Profile setup. Delivered in about 7 days.
- Pro: from $1,299 / £1,049 / AED 4,799 / ₹54,999. Everything in Growth, unlimited pages, multiple smart tools and integrations, email and SMS lead alerts, copywriting included. About 10-14 days.
- Optional Care plan: $49 / £39 / AED 179 / ₹1,999 per month. Hosting, updates, backups, monthly edits, priority support.
- Domain costs roughly $10-15 per year. Payments by international transfer (Wise or PayPal), invoiced in USD, GBP, AED or INR.

Process:
1. Free demo: the client shares their business details and gets a demo of their new homepage within 48 hours, free and with no obligation.
2. Feedback: refine design, content and features together.
3. Build and launch: full site, domain, booking, tested on every device.
4. Grow: Google setup, lead tracking, keeping the site fast and updated.
- No payment is needed until the client is happy with the demo. Replies to enquiries within 24 hours.

Live demo websites (all working, fictional businesses):
- Northline Realty (real estate, USA): property search, saved homes, mortgage calculator, home valuation, tour booking. https://akki07-hub.github.io/northlinereality/
- Lumen Dental (dental clinic, USA): booking wizard, insurance checker, AI front desk, specialist team. https://akki07-hub.github.io/LUMENDENTAL/
- Sage & Stone (salon and spa, UK): booking basket, treatment quiz, gift card designer. https://akki07-hub.github.io/sagestone/
- Riverbend Plumbing (home services, USA): instant price estimator, ZIP checker, emergency chat. https://akki07-hub.github.io/riverbend/
- CXR Fitness Club (gym, USA): free trial booking, BMI tool, chat assistant. https://akki07-hub.github.io/FUTURE_FS_03/

FAQ:
- Do clients need to provide text and photos? Helpful but not required; CXR Digital can write copy (included in Pro) and use licensed stock photos.
- How does the AI chat assistant work? It's trained on the business's services, prices and FAQs, answers customers instantly and points them to booking; answers can be updated any time.
- Contact: the "Get a free demo" form on this page, or Instagram and Threads @cxrdigital.`;

function handleChat(p) {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if (!key) return json({ ok: false, error: 'not_configured' });

    // Parse and validate the conversation sent by the browser.
    let history;
    try { history = JSON.parse(p.history || '[]'); } catch (_) { return json({ ok: false, error: 'bad_request' }); }
    if (!Array.isArray(history) || history.length === 0 || history.length > MAX_HISTORY_MESSAGES) {
      return json({ ok: false, error: history && history.length > MAX_HISTORY_MESSAGES ? 'conversation_full' : 'bad_request' });
    }
    for (let i = 0; i < history.length; i++) {
      const m = history[i];
      const expected = i % 2 === 0 ? 'user' : 'assistant';
      if (!m || m.role !== expected) return json({ ok: false, error: 'bad_request' });
      if (m.role === 'user' && (typeof m.content !== 'string' || !m.content.trim() || m.content.length > MAX_USER_MESSAGE_CHARS)) {
        return json({ ok: false, error: 'bad_request' });
      }
      if (m.role === 'assistant' && !Array.isArray(m.content)) return json({ ok: false, error: 'bad_request' });
    }
    if (history[history.length - 1].role !== 'user') return json({ ok: false, error: 'bad_request' });

    // Rate limits keep the monthly bill predictable.
    const limit = checkRateLimits(String(p.sid || '').slice(0, 64));
    if (limit) return json({ ok: false, error: limit });

    const body = {
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      output_config: { effort: AI_EFFORT },
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: history
    };
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2026-10-21',
        'anthropic-beta': 'server-side-fallback-2026-07-01'
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    if (code === 429 || code === 529 || code >= 500) return json({ ok: false, error: 'busy' });
    if (code !== 200) {
      console.error('Anthropic API error ' + code + ': ' + res.getContentText().slice(0, 500));
      return json({ ok: false, error: 'api_error' });
    }

    const msg = JSON.parse(res.getContentText());
    if (msg.stop_reason === 'refusal') return json({ ok: false, error: 'refusal' });

    const reply = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!reply) return json({ ok: false, error: 'empty' });

    // Return the full content array so the browser can send it back unchanged next turn.
    return json({ ok: true, reply: reply, content: msg.content });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server_error' });
  }
}

function checkRateLimits(sid) {
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  const now = new Date();
  const minuteKey = 'rl_min_' + Math.floor(now.getTime() / 60000);
  const sidKey = sid ? 'rl_sid_' + sid : null;
  const today = Utilities.formatDate(now, 'UTC', 'yyyyMMdd');

  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    // Daily count lives in Script Properties (the cache forgets after 6 hours).
    const saved = String(props.getProperty('CHAT_DAY_COUNT') || '').split(':');
    const perDay = saved[0] === today ? Number(saved[1] || 0) : 0;
    const perMin = Number(cache.get(minuteKey) || 0);
    const perSid = sidKey ? Number(cache.get(sidKey) || 0) : 0;
    if (perDay >= MAX_CHATS_PER_DAY) return 'daily_limit';
    if (perMin >= MAX_CHATS_PER_MINUTE) return 'busy';
    if (sidKey && perSid >= MAX_CHATS_PER_SESSION) return 'conversation_full';
    props.setProperty('CHAT_DAY_COUNT', today + ':' + (perDay + 1));
    cache.put(minuteKey, String(perMin + 1), 120);
    if (sidKey) cache.put(sidKey, String(perSid + 1), 21600);
    return null;
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
