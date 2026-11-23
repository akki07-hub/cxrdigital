/*
 * CXR Digital - agency site
 *
 * Demo requests are saved to Google Sheets. Paste your Apps Script
 * "Web app" URL (ends in /exec) below. See setup/GOOGLE-SHEETS-SETUP.md.
 * While it's empty, the form falls back to an Instagram DM message.
 */
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzF6wKUJKX3ruQCPn3RnaDQ31MEx2tH8TIDsr5CPC1IvCBkhVZLdAOGNQwZ3IqN2wpJ/exec';

(function () {
    'use strict';
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Header */
    const header = $('#header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const burger = $('#burger'), nav = $('#nav');
    burger.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(open));
    });
    $$('#nav a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));
    $('#year').textContent = new Date().getFullYear();

    /* Pixel background (brand motif) */
    const canvas = $('#pixels');
    const ctx = canvas.getContext('2d');
    let pixels = [], W = 0, H = 0;
    const SIZE = 6, GAP = 34;
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pixels = [];
        const count = Math.round((W * H) / 26000);
        for (let i = 0; i < count; i++) {
            pixels.push({
                x: Math.floor(Math.random() * (W / GAP)) * GAP,
                y: Math.floor(Math.random() * (H / GAP)) * GAP,
                p: Math.random() * Math.PI * 2,
                s: 0.004 + Math.random() * 0.012,
                c: Math.random() > 0.5 ? '31,123,255' : '74,163,255'
            });
        }
    }
    function draw() {
        ctx.clearRect(0, 0, W, H);
        pixels.forEach((px) => {
            px.p += px.s;
            const a = (Math.sin(px.p) + 1) / 2 * 0.35;
            ctx.fillStyle = `rgba(${px.c},${a})`;
            ctx.fillRect(px.x, px.y, SIZE, SIZE);
        });
        if (!reduce) requestAnimationFrame(draw);
    }
    resize();
    draw();
    window.addEventListener('resize', resize);

    /* Work filter */
    $$('.filter').forEach((f) => f.addEventListener('click', () => {
        const cat = f.dataset.filter;
        $$('.filter').forEach((x) => x.classList.toggle('active', x === f));
        $$('#work-grid .work').forEach((w) => {
            const show = cat === 'all' || w.dataset.cat.split(' ').includes(cat);
            w.hidden = !show;
            w.classList.toggle('work-lg', show && w.dataset.cat === 'property' && cat === 'all');
        });
    }));

    /* Currency switch */
    const SYM = { USD: '$', GBP: '£', INR: '₹' };
    $$('.cur').forEach((b) => b.addEventListener('click', () => {
        const cur = b.dataset.cur;
        $$('.cur').forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-checked', String(on)); });
        $$('.amt').forEach((a) => {
            a.textContent = SYM[cur] + a.dataset[cur.toLowerCase()];
            a.classList.remove('swap'); void a.offsetWidth; a.classList.add('swap');
        });
    }));
    // Default to INR for visitors in India
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') $('.cur[data-cur="INR"]').click();
        else if (tz === 'Europe/London') $('.cur[data-cur="GBP"]').click();
    } catch (_) { /* ignore */ }

    /* Plan buttons pre-select plan */
    $$('[data-plan]').forEach((b) => b.addEventListener('click', () => { $('#c-plan').value = b.dataset.plan; }));

    /* Reveal on scroll */
    const revealEls = $$('.sec-head, .work, .svc, .plan, .steps li, .why-list li, .faq details, .contact-form');
    if ('IntersectionObserver' in window && !reduce) {
        revealEls.forEach((el) => el.classList.add('reveal'));
        const io = new IntersectionObserver((entries) => entries.forEach((e) => {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach((el) => io.observe(el));
    }

    /* Contact form */
    const form = $('#contact-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = $('#form-msg');
        const name = $('#c-name'), biz = $('#c-biz'), email = $('#c-email'), site = $('#c-site');
        const bad = (el, c) => { el.classList.toggle('invalid', c); el.setAttribute('aria-invalid', String(c)); return c; };
        // Website is optional and free text. Only add https:// when it looks like a domain (e.g. bloomdental.com).
        const siteVal = site.value.trim();
        if (/^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(siteVal) && !/^https?:\/\//i.test(siteVal)) site.value = 'https://' + siteVal;
        const errs = [
            bad(name, name.value.trim().length < 2) && 'your name',
            bad(biz, biz.value.trim().length < 2) && 'your business name',
            bad(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) && 'a valid email'
        ].filter(Boolean);
        if (errs.length) {
            msg.className = 'form-msg err';
            msg.textContent = 'Please add ' + errs.join(', ') + '.';
            $('.invalid', form).focus();
            return;
        }
        const data = {
            name: name.value.trim(), business: biz.value.trim(), email: email.value.trim(),
            phone: $('#c-phone').value.trim(), industry: $('#c-industry').value, plan: $('#c-plan').value,
            website: site.value.trim(), message: $('#c-msg').value.trim(),
            page: location.href, company_hp: $('#c-company').value
        };
        // Bots fill the hidden field; quietly pretend success and send nothing.
        if (data.company_hp) {
            msg.className = 'form-msg ok';
            msg.textContent = 'Thanks! We\'ll be in touch.';
            form.reset();
            return;
        }
        const btn = $('#c-submit');
        btn.disabled = true;
        btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';
        try {
            if (GOOGLE_SHEET_URL) {
                // Form-encoded "simple" request: no CORS preflight, which Apps Script can't answer.
                // The response is opaque (no-cors), so a network failure is the only error we can see.
                await fetch(GOOGLE_SHEET_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) });
                msg.className = 'form-msg ok';
                msg.textContent = `Thanks ${data.name.split(' ')[0]}! We'll send your free demo for ${data.business} within 48 hours.`;
                form.reset();
            } else {
                // No form service connected yet: hand off to Instagram DMs with the details ready to paste.
                const text = `Hi CXR Digital! I'd like a free demo.\nName: ${data.name}\nBusiness: ${data.business} (${data.industry})\nPlan: ${data.plan}\nEmail: ${data.email}${data.phone ? '\nPhone: ' + data.phone : ''}${data.website ? '\nWebsite: ' + data.website : ''}${data.message ? '\nNeeds: ' + data.message : ''}`;
                let copied = false;
                try { await navigator.clipboard.writeText(text); copied = true; } catch (_) { /* clipboard blocked */ }
                msg.className = 'form-msg ok';
                msg.innerHTML = `Thanks ${data.name.split(' ')[0]}! ${copied ? 'Your details are copied. ' : ''}<a class="text-link" href="https://ig.me/m/cxrdigital" target="_blank" rel="noopener">Send them to us on Instagram</a> and we'll reply within 24 hours.`;
            }
        } catch (err) {
            msg.className = 'form-msg err';
            msg.innerHTML = 'Something went wrong. Please message us on <a class="text-link" href="https://www.instagram.com/cxrdigital/" target="_blank" rel="noopener">Instagram</a>.';
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Get my free demo <i class="fas fa-paper-plane"></i>';
        }
    });
})();
