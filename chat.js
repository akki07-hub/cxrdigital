/*
 * CXR Digital - AI chat widget
 *
 * Talks to the same Google Apps Script web app as the lead form
 * (action=chat). The Apps Script calls Claude with the API key stored
 * in Script Properties, so no secret ever reaches the browser.
 */
(function () {
    'use strict';
    const ENDPOINT = window.CXR_BACKEND_URL;
    const MAX_CHARS = 800;
    const MAX_MESSAGES = 24; // matches MAX_HISTORY_MESSAGES on the server

    const $ = (s, r = document) => r.querySelector(s);
    const launcher = $('#ai-launcher');
    const panel = $('#ai-panel');
    const log = $('#ai-log');
    const form = $('#ai-form');
    const input = $('#ai-input');
    const sendBtn = $('#ai-send');
    const chips = $('#ai-chips');
    const counter = $('#ai-count');
    if (!launcher || !panel || !ENDPOINT) return;

    // Conversation sent to the server. Assistant turns keep the full content
    // array returned by the API, unchanged, so the history is append-only.
    const history = [];
    let busy = false;
    let started = false;
    const sid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 36);

    const ERRORS = {
        not_configured: 'The AI assistant is being set up. Meanwhile, use the "Get a free demo" form below or DM us on Instagram @cxrdigital.',
        busy: 'Lots of people are chatting right now. Please try again in a minute.',
        daily_limit: 'The assistant has reached today\'s limit. Please use the free demo form below and we\'ll reply within 24 hours.',
        conversation_full: 'This chat is getting long! For anything else, use the free demo form below and we\'ll reply personally within 24 hours.',
        refusal: 'Sorry, I can\'t help with that one. Ask me about websites, pricing or our demos.',
        network: 'I couldn\'t connect. Check your internet and try again, or use the demo form below.'
    };

    function escapeHtml(t) {
        return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    // Escape first, then turn plain URLs into links. Nothing from the model is inserted as HTML.
    function linkify(text) {
        return escapeHtml(text).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
    }

    function addMsg(text, who, extraClass) {
        const el = document.createElement('div');
        el.className = 'ai-msg ' + who + (extraClass ? ' ' + extraClass : '');
        el.innerHTML = linkify(text);
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
        return el;
    }

    function addCta() {
        const row = document.createElement('div');
        row.className = 'ai-cta';
        row.innerHTML = '<a href="#contact" class="ai-cta-btn"><i class="fas fa-bolt"></i> Get a free demo</a>';
        row.querySelector('a').addEventListener('click', () => toggle(window.innerWidth > 560));
        log.appendChild(row);
        log.scrollTop = log.scrollHeight;
    }

    function typing(on) {
        let t = $('.ai-typing', log);
        if (on && !t) {
            t = document.createElement('div');
            t.className = 'ai-msg bot ai-typing';
            t.innerHTML = '<i></i><i></i><i></i>';
            log.appendChild(t);
            log.scrollTop = log.scrollHeight;
        } else if (!on && t) {
            t.remove();
        }
    }

    function setBusy(b) {
        busy = b;
        sendBtn.disabled = b;
        input.disabled = b;
        chips.classList.toggle('hidden', b || history.length > 0);
    }

    // Check that the backend has the chat feature before sending anything.
    // The probe carries the lead form's spam-trap field and an empty history:
    // an older backend (leads only) ignores it without writing a row and replies
    // {ok:true}; the chat-enabled backend rejects it as bad_request. Either way
    // nothing is stored and no AI call is made.
    let ready = null; // null = unknown, Promise while checking, true/false after
    function checkBackend() {
        if (ready === true || ready === false) return Promise.resolve(ready);
        if (ready) return ready;
        ready = fetch(ENDPOINT, { method: 'POST', body: new URLSearchParams({ action: 'chat', company_hp: 'probe', history: '[]' }) })
            .then((r) => r.json())
            .then((d) => (ready = !!(d && d.ok === false && d.error)))
            .catch(() => (ready = null, false));
        return ready;
    }

    async function ask(text) {
        const q = text.trim().slice(0, MAX_CHARS);
        if (!q || busy) return;
        if (!(await checkBackend())) {
            addMsg(q, 'me');
            addMsg(ready === null ? ERRORS.network : ERRORS.not_configured, 'bot', 'ai-note');
            addCta();
            return;
        }
        if (history.length + 1 > MAX_MESSAGES) {
            addMsg(ERRORS.conversation_full, 'bot', 'ai-note');
            addCta();
            return;
        }
        addMsg(q, 'me');
        history.push({ role: 'user', content: q });
        setBusy(true);
        typing(true);

        let data;
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                // Form-encoded keeps this a "simple" request (no CORS preflight).
                body: new URLSearchParams({ action: 'chat', sid, history: JSON.stringify(history) })
            });
            data = await res.json();
        } catch (_) {
            data = { ok: false, error: 'network' };
        }
        typing(false);

        if (data && data.ok && Array.isArray(data.content)) {
            history.push({ role: 'assistant', content: data.content });
            addMsg(data.reply, 'bot');
            if (/free demo|demo form|get started/i.test(data.reply)) addCta();
        } else {
            // Remove the unanswered question so the next message keeps user/assistant turns alternating.
            history.pop();
            const key = data && data.error;
            addMsg(ERRORS[key] || 'Something went wrong. Please try again, or use the free demo form below.', 'bot', 'ai-note');
            if (key === 'conversation_full' || key === 'daily_limit' || key === 'not_configured') addCta();
        }
        setBusy(false);
        input.focus();
    }

    function toggle(show) {
        const open = typeof show === 'boolean' ? show : panel.hidden;
        panel.hidden = !open;
        launcher.classList.toggle('open', open);
        launcher.setAttribute('aria-expanded', String(open));
        if (open) {
            if (!started) {
                started = true;
                addMsg('Hi! I\'m the CXR Digital AI assistant. Ask me anything about websites, pricing, timelines or our live demos.', 'bot');
                checkBackend(); // warm up the check while the visitor types
            }
            setTimeout(() => input.focus(), 60);
        } else {
            launcher.focus();
        }
    }

    launcher.addEventListener('click', () => toggle());
    $('#ai-close').addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = input.value;
        input.value = '';
        counter.textContent = '';
        ask(v);
    });
    input.addEventListener('input', () => {
        const left = MAX_CHARS - input.value.length;
        counter.textContent = left < 120 ? left + ' left' : '';
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    chips.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) ask(b.textContent);
    });

    // Show the "Ask our AI chatbot" bubble once per visit, so touch devices
    // (which have no hover) also discover the chat.
    let seen = false;
    try { seen = sessionStorage.getItem('cxr-ai-peek') === '1'; } catch (_) { /* storage blocked */ }
    if (!seen) {
        setTimeout(() => {
            if (!panel.hidden) return;
            launcher.classList.add('peek');
            try { sessionStorage.setItem('cxr-ai-peek', '1'); } catch (_) { /* ignore */ }
            setTimeout(() => launcher.classList.remove('peek'), 4500);
        }, 3500);
    }
    launcher.addEventListener('click', () => launcher.classList.remove('peek'));

    window.CXRChat = { ask, toggle, history };
})();
