# Turn on the AI chat assistant

The website's "Ask our AI" chat runs through your existing Google Apps Script, which calls Claude (Anthropic) with your API key. The key stays inside your Google account and never appears in the website code.

## 1. Get an Anthropic API key
1. Go to **https://console.anthropic.com** and sign up (use cxrdigitaltech@gmail.com).
2. **Billing:** add credits. $5 is enough to start.
3. **Set a spend limit** (Settings → Limits), for example $10 a month, so the bill can never surprise you.
4. **API Keys → Create Key.** Name it `cxr-website` and copy it. You'll only see it once.
   **Never paste this key into the website code, GitHub, chats or screenshots.**

## 2. Store the key in Apps Script
1. Open your Apps Script project (Extensions → Apps Script from your leads sheet).
2. Click **⚙️ Project Settings** (left sidebar) → scroll to **Script Properties** → **Add script property**.
   - Property: `ANTHROPIC_API_KEY`
   - Value: *(paste your key)*
3. Click **Save script properties**.

## 3. Update the script code
1. Go back to the **Editor** (`< >` icon) and open `Code.gs`.
2. Select all, delete, and paste the full contents of `apps-script.gs` from this folder.
3. Line 15: put your email back in, so lead alerts keep working:
   `const NOTIFY_EMAIL = 'cxrdigitaltech@gmail.com';`
4. Press **Ctrl + S**.

## 4. Redeploy (keeps the same URL)
1. **Deploy → Manage deployments.**
2. Click the **✏️ pencil** → **Version: New version** → **Deploy**.
3. Google asks you to authorize again, because the script now connects to an outside service (Anthropic). Approve it the same way as before.

**Don't** click "New deployment". That creates a different URL, and the website would stop working.

## Costs and limits (already built in)
| Setting (top of the script) | Default | What it does |
|---|---|---|
| `AI_MODEL` | `claude-opus-5-5` | Anthropic's current flagship model |
| `AI_EFFORT` | `low` | Fast, short replies for chat |
| `AI_MAX_TOKENS` | `2000` | Caps the length of each reply |
| `MAX_CHATS_PER_DAY` | `300` | Daily ceiling across all visitors |
| `MAX_CHATS_PER_SESSION` | `15` | Per-visitor conversation length |
| `MAX_CHATS_PER_MINUTE` | `20` | Stops bursts and abuse |

Rough cost on Claude Opus 5.5: about **1-2 cents per message**. Even if the daily cap is hit every day, the Console spend limit keeps you safe.

## What visitors see if something's off
- **No key set:** "The AI assistant is being set up…", with a button to the demo form.
- **Limits reached or API busy:** a friendly message pointing to the demo form.
