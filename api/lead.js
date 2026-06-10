'use strict';

/**
 * SQM Hungary — lead endpoint (Vercel serverless, Node 18+ runtime)
 * A BACKEND.md pipeline szerint: validáció → Meta Conversions API (CAPI) → n8n továbbítás.
 * Emellett egy FÜGGETLEN, best-effort hívás a Partner CRM felé (az n8n flow VÁLTOZATLAN).
 * Mezők (ipari padló lead-gen): nev, email, telefon, ceg, szektor, terulet.
 * A kliens Pixel `Lead` és a szerver CAPI `Lead` KÖZÖS event_id-val megy → dedup.
 */

const crypto = require('node:crypto');

const PIXEL_ID   = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const CAPI_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || '';
const TEST_CODE  = process.env.META_TEST_EVENT_CODE || '';
const N8N_URL    = process.env.N8N_WEBHOOK_URL || '';
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
const CRM_URL    = process.env.CRM_WEBHOOK_URL || '';
const CRM_SECRET = process.env.CRM_WEBHOOK_SECRET || '';
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

/* ---------- Partner CRM (független az n8n-től; best-effort) ----------
 * Külön HTTP-hívás a CRM webhookra. Nem nyúl az n8n flow-hoz, nem vonja össze a hívásokat.
 * Szabály: contact.custom KULCSOK kötöttek (^[a-z0-9_]{1,40}$, ékezet nélküli snake_case),
 * az ÉRTÉKEK szabad szövegek. Üres értékű mező kimarad. UTM + landing_url a custom-ba is.
 */
const CRM_CUSTOM_KEY = /^[a-z0-9_]{1,40}$/;

// Form-mező -> CRM contact.custom kulcs (ékezet nélküli snake_case).
const CRM_CUSTOM_FIELD_MAP = { szektor: 'szektor', terulet: 'terulet' };

// Forrás-attribúció: a CRM ezeket "tracking" mezőként kezeli (csak operátor/admin látja).
const CRM_TRACKING_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'gclid', 'landing_url'
];

function crmStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

// contact.custom = a form egyedi mezői + tracking (UTM + landing_url).
// Csak szabályos kulcs és nem üres érték kerül be.
function buildCrmCustom(b, a) {
  const out = {};
  for (const formKey in CRM_CUSTOM_FIELD_MAP) {
    const crmKey = CRM_CUSTOM_FIELD_MAP[formKey];
    if (!CRM_CUSTOM_KEY.test(crmKey)) continue;
    const v = crmStr(b[formKey]);
    if (v) out[crmKey] = v;
  }
  for (const key of CRM_TRACKING_KEYS) {
    const v = crmStr(a[key]);
    if (v) out[key] = v;            // utm_* + fbclid/gclid + landing_url
  }
  return out;
}

// Szerveroldali, az n8n-től független CRM-hívás. A hibája SOHA nem blokkolja a form választ.
async function sendCrm(b) {
  if (b.partial === true) return { ok: false, skipped: 'partial' };  // részkitöltést egyelőre nem küldünk a CRM-nek
  if (!CRM_URL || !CRM_SECRET) return { ok: false, skipped: true };

  const a = b.attribution || {};
  const payload = {
    client_id: '4bba08c3-93ef-4636-9c3a-a2f7d23d1588',   // a célügyfél azonosítója (UUID)
    source: 'landing_form',
    // Kampányszintű attribúció (az UTM-ek a contact.custom-ba is bekerülnek):
    campaign: {
      name: 'Weboldal űrlap',
      utm_source: crmStr(a.utm_source),
      utm_medium: crmStr(a.utm_medium),
      utm_campaign: crmStr(a.utm_campaign),
      utm_content: crmStr(a.utm_content),
      utm_term: crmStr(a.utm_term)
    },
    contact: {
      full_name: crmStr(b.nev),
      email: crmStr(b.email),
      phone: crmStr(b.telefon),
      company_name: crmStr(b.ceg),
      custom: buildCrmCustom(b, a)   // egyedi mezők + UTM + landing_url
    }
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(CRM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': CRM_SECRET },
      body: JSON.stringify(payload), signal: ctrl.signal
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) console.error('[lead] CRM küldés sikertelen: HTTP ' + r.status);
    return { ok: r.ok, status: r.status, body: j };
  } catch (e) {
    console.error('[lead] CRM küldés hiba:', String((e && e.message) || e));
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

  // Partner CRM párhuzamosan, az n8n-től FÜGGETLENÜL; a hibája soha nem blokkol.
  // Az azonosítás a client_id alapján történik; external_lead_id-t nem küldünk.
  // A részkitöltéseket (partial: true) egyelőre NEM küldjük a CRM-nek (az n8n-nek igen).
  const crmPromise = sendCrm(body).catch(e => ({ ok: false, error: String(e) }));

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
        const [capi, crm] = await Promise.all([capiPromise, crmPromise]);
        return send(res, 502, { error: 'Nem sikerült rögzíteni a leadet, kérjük próbálja újra.', status: r.status, detail: detail.slice(0, 300), capi, crm });
      }
    } catch (e) {
      const [capi, crm] = await Promise.all([capiPromise, crmPromise]);
      return send(res, 502, { error: 'Nem sikerült rögzíteni a leadet, kérjük próbálja újra.', detail: String((e && e.message) || e), capi, crm });
    }
    const [capi, crm] = await Promise.all([capiPromise, crmPromise]);
    return send(res, 200, { ok: true, capi, crm });
  }

  // Dev mód: nincs N8N_WEBHOOK_URL → csak logol (a CAPI és a CRM ettől még fut, ha be van állítva)
  const [capi, crm] = await Promise.all([capiPromise, crmPromise]);
  console.log('[lead] devMode (nincs N8N_WEBHOOK_URL):', JSON.stringify({ nev: body.nev, email: body.email, partial: !!body.partial, szektor: body.szektor, terulet: body.terulet }));
  return send(res, 200, { ok: true, devMode: true, capi, crm });
};
