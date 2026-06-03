'use strict';

/**
 * SQM Hungary — lead endpoint (Vercel serverless, Node 18+ runtime)
 * A BACKEND.md pipeline szerint: validáció → Meta Conversions API (CAPI) → n8n továbbítás.
 * Mezők (ipari padló lead-gen): nev, email, telefon, ceg, szektor, terulet.
 * A kliens Pixel `Lead` és a szerver CAPI `Lead` KÖZÖS event_id-val megy → dedup.
 */

const crypto = require('node:crypto');

const PIXEL_ID   = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const CAPI_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || '';
const TEST_CODE  = process.env.META_TEST_EVENT_CODE || '';
const N8N_URL    = process.env.N8N_WEBHOOK_URL || '';
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const GRAPH = 'https://graph.facebook.com/v21.0';

/* ---------- helpers ---------- */
const sha256 = v => crypto.createHash('sha256').update(String(v)).digest('hex');
const digitsOnly = s => String(s || '').replace(/\D/g, '');
const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

// Magyar telefonszám → E.164 (csak számjegyek, országkóddal) a jobb Meta match-quality-ért
function normPhoneE164(p) {
  let d = digitsOnly(p);
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('06')) d = '36' + d.slice(2);
  else if (d.startsWith('0')) d = '36' + d.slice(1);
  if (!d.startsWith('36') && d.length <= 9) d = '36' + d; // csupasz belföldi szám
  return d;
}

function clean(o) {
  const r = {};
  for (const k in o) { const v = o[k]; if (v !== undefined && v !== null && v !== '') r[k] = v; }
  return r;
}

function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function readBody(req) {
  return new Promise(resolve => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); } }
      return resolve(req.body);
    }
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function validate(b) {
  const e = [];
  if (!b.nev || String(b.nev).trim().length < 2) e.push('Kérjük, adja meg a nevét.');
  if (!isEmail(b.email)) e.push('Kérjük, adjon meg egy érvényes e-mail címet.');
  const pd = digitsOnly(b.telefon);
  if (pd.length < 7 || pd.length > 15) e.push('Kérjük, adjon meg egy érvényes telefonszámot.');
  if (b.partial !== true) {
    if (!b.ceg || String(b.ceg).trim().length < 2) e.push('Kérjük, adja meg a cég nevét.');
    if (!b.szektor) e.push('Kérjük, válasszon iparágat.');
    if (!b.terulet) e.push('Kérjük, adja meg a terület nagyságát.');
  }
  return e;
}

/* ---------- Meta Conversions API ---------- */
async function sendCapi(b, meta) {
  if (!PIXEL_ID || !CAPI_TOKEN) return { ok: false, skipped: true };

  const isPartial = b.partial === true;
  const parts = String(b.nev || '').trim().split(/\s+/).filter(Boolean);
  const fn = parts[0] || '';
  const ln = parts.slice(1).join(' ');

  const user_data = {};
  if (b.email) user_data.em = [sha256(String(b.email).trim().toLowerCase())];
  const ph = normPhoneE164(b.telefon); if (ph) user_data.ph = [sha256(ph)];
  if (fn) user_data.fn = [sha256(fn.toLowerCase())];
  if (ln) user_data.ln = [sha256(ln.toLowerCase())];
  user_data.country = [sha256('hu')];
  if (meta.fbp) user_data.fbp = meta.fbp;
  let fbc = meta.fbc;
  if (!fbc && b.attribution && b.attribution.fbclid) {
    fbc = 'fb.1.' + (b.attribution.captured_at || Date.now()) + '.' + b.attribution.fbclid;
  }
  if (fbc) user_data.fbc = fbc;
  if (meta.ip) user_data.client_ip_address = meta.ip;
  if (meta.ua) user_data.client_user_agent = meta.ua;

  const a = b.attribution || {};
  const custom_data = clean({
    lead_source: b.forras, company: b.ceg, sector: b.szektor, area: b.terulet, partial: isPartial,
    utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign,
    utm_content: a.utm_content, utm_term: a.utm_term, utm_id: a.utm_id,
    fbclid: a.fbclid, gclid: a.gclid, msclkid: a.msclkid, ttclid: a.ttclid, li_fat_id: a.li_fat_id
  });

  const payload = { data: [{
    event_name: isPartial ? 'LeadPartial' : 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: b.event_id,
    event_source_url: b.event_source_url,
    action_source: 'website',
    user_data, custom_data
  }] };
  if (TEST_CODE) payload.test_event_code = TEST_CODE;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${GRAPH}/${PIXEL_ID}/events?access_token=${encodeURIComponent(CAPI_TOKEN)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl.signal
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body: j };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- handler ---------- */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  if (ALLOWED_ORIGINS.length) {
    const origin = req.headers.origin || '';
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return send(res, 403, { error: 'Forbidden origin' });
  }

  const body = await readBody(req);

  // Honeypot: ha a rejtett mező ki van töltve → bot. Csendben "ok", nincs továbbítás.
  if (body.hp) return send(res, 200, { ok: true, skipped: 'spam' });

  const errors = validate(body);
  if (errors.length) return send(res, 422, { error: errors.join(' ') });

  const ip = (String(req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim();
  const ua = req.headers['user-agent'] || '';
  const meta = { ip, ua, fbp: getCookie(req, '_fbp'), fbc: getCookie(req, '_fbc') };

  // CAPI párhuzamosan; a hibája soha nem blokkolja a lead-rögzítést
  const capiPromise = sendCapi(body, meta).catch(e => ({ ok: false, error: String(e) }));

  // n8n továbbítás (ha be van állítva)
  if (N8N_URL) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (N8N_SECRET) headers['Authorization'] = 'Bearer ' + N8N_SECRET;
      const fwd = Object.assign({}, body, { client_ip: ip, client_user_agent: ua, fbp: meta.fbp, fbc: meta.fbc });
      delete fwd.hp;
      const r = await fetch(N8N_URL, { method: 'POST', headers, body: JSON.stringify(fwd) });
      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        const capi = await capiPromise;
        return send(res, 502, { error: 'Nem sikerült rögzíteni a leadet, kérjük próbálja újra.', status: r.status, detail: detail.slice(0, 300), capi });
      }
    } catch (e) {
      const capi = await capiPromise;
      return send(res, 502, { error: 'Nem sikerült rögzíteni a leadet, kérjük próbálja újra.', detail: String((e && e.message) || e), capi });
    }
    const capi = await capiPromise;
    return send(res, 200, { ok: true, capi });
  }

  // Dev mód: nincs N8N_WEBHOOK_URL → csak logol (a CAPI ettől még fut, ha be van állítva)
  const capi = await capiPromise;
  console.log('[lead] devMode (nincs N8N_WEBHOOK_URL):', JSON.stringify({ nev: body.nev, email: body.email, partial: !!body.partial, szektor: body.szektor, terulet: body.terulet }));
  return send(res, 200, { ok: true, devMode: true, capi });
};
