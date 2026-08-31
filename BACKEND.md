# Megordiusz — backend & mérési pipeline összefoglaló

Ez a dokumentum a **teljes weboldal-backend és mérési (Meta) pipeline** reprodukálható
leírása. Annyira részletes, hogy ez alapján a teljes szerveroldali és kliensoldali
követési logika a nulláról újraépíthető. A vizuális/branding réteget (színek, szövegek,
layout) szándékosan csak ott említi, ahol a mérés szempontjából lényeges.

> **Megjegyzés a `MULTISTEP_FORM_SPEC.md`-ről:** az a régebbi dokumentum egy Next.js/React/TS
> változatot ír le, és a 6. lépést `tevekenyseg` (cég profilja) néven. **Az élő oldal ettől eltér**:
> sima statikus HTML + egyetlen Vercel serverless függvény, és a 6. lépés a **lejárt számla
> összege (`osszeg`)**. Ez a dokumentum a **tényleges, élesben futó** kódot írja le.

---

## 1. Architektúra — magas szintű

```
   Böngésző (statikus HTML + inline JS)
   ├─ Meta Pixel (fbevents.js)  → PageView / Lead / CompleteRegistration
   ├─ fetch POST <CRM_FORM_URL> ───► Partner CRM nyilvános űrlap-végpont
   │                                 (részleges mentés + végleges beküldés, resume-tokennel)
   └─ fetch POST /api/lead ──────┐   (csak SIKERES CRM-rögzítés után)
                                 │
   Vercel serverless függvény (api/lead.js, Node.js)
   ├─ validáció (név/email/telefon, teljesnél +cég/szektor/terület)
   ├─ n8n webhook ──────────────────► automatizáció (traininghungary.app.n8n.cloud)
   └─ Meta Conversions API (CAPI) ──► graph.facebook.com/v21.0/<pixel>/events
                                      (CSAK sikeres n8n-kézbesítés után)
```

- **Frontend:** tisztán statikus HTML + inline `<script>` — nincs build lépés, nincs framework.
- **Backend:** egyetlen Node.js serverless függvény (`api/lead.js`), Vercel automatikusan
  deployolja `/api/lead` útvonalra.
- **Mérés kettős:** kliensoldali **Meta Pixel** és szerveroldali **Conversions API (CAPI)**,
  közös `event_id`-val deduplikálva.
- **Lead-kézbesítés két ágon:**
  1. **Partner CRM** — a *kliens* küldi közvetlenül a CRM **nyilvános űrlap-végpontjára**
     (`CRM_FORM_URL`). Ez a form „háttere": a telefonszám utáni **részleges mentés** egy
     resume-tokent ad vissza, amit a végleges beküldés visz magával → **egy leadből egy deal**.
  2. **n8n** — a szerver (`/api/lead`) továbbítja a leadet az automatizációnak, változatlanul.
- **A siker mércéje a CRM válasza:** a Pixel `Lead`, az `/api/lead` hívás és a köszönőoldalra
  irányítás **csak sikeres CRM-rögzítés után** történik. Így nincs mért konverzió olyan leadre,
  ami sehol nem érkezett be.

---

## 2. Repó-struktúra

| Útvonal | Szerep |
|---|---|
| `index.html` | Landing oldal — SITE_CONFIG, Pixel loader, attribúció, 6 lépéses form, teljes inline JS |
| `koszonjuk-ajanlat/index.html` | Köszönő oldal — `CompleteRegistration` Pixel event, `?nev=` köszöntés |
| `api/lead.js` | Serverless endpoint — validáció + n8n továbbítás + CAPI (a CRM-be a kliens küld) |
| `.env.example` | Környezeti változók sablonja (Vercel-be másolandó) |
| `favicon.avif`, `logo.webp`, `partners/*` | Statikus assetek |
| `MULTISTEP_FORM_SPEC.md` | (Elavult) korábbi React-változat specifikációja |

> Nincs `package.json`, `vercel.json` és build script. A Vercel a gyökér statikus fájljait
> kiszolgálja, az `api/` mappa fájljait pedig serverless függvényként futtatja (beépített Node runtime).

---

## 3. Hosting és deploy (Vercel)

- **Statikus kiszolgálás:** gyökérből (`index.html`, assetek). A `/koszonjuk-ajanlat` „clean URL"
  a `koszonjuk-ajanlat/index.html` mappa-indexből jön (Vercel default).
- **Függvény:** `api/lead.js` → `POST /api/lead`. CommonJS modul (`module.exports = async function handler(req, res)`),
  `require('node:crypto')`, globális `fetch` (Node 18+ runtime).
- **Env változók:** Vercel → Project Settings → Environment Variables, környezetenként
  (Production / Preview / Development) külön értékkel.

---

## 4. Környezeti változók

| Változó | Hol fut | Kötelező? | Leírás |
|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` (vagy `META_PIXEL_ID`) | szerver | igen (CAPI-hoz) | Meta Pixel ID. A szerver bármelyiket olvassa. |
| `META_CAPI_ACCESS_TOKEN` | szerver | igen (CAPI-hoz) | Hosszú élettartamú CAPI access token (Events Manager → Settings). |
| `META_TEST_EVENT_CODE` | szerver | nem | Ha be van állítva, az események a Test Events fülre mennek. |
| `N8N_WEBHOOK_URL` | szerver | igen (éles továbbításhoz) | n8n webhook URL. Ha üres → **dev mód** (csak konzolra logol). |
| `N8N_WEBHOOK_SECRET` | szerver | nem | Ha van, `Authorization: Bearer <secret>` fejlécet küld az n8n felé. |
| `CRM_WEBHOOK_URL` | szerver | igen (CRM továbbításhoz) | Partner CRM webhook URL. Ha üres → a CRM-hívás kimarad (nem hiba). |
| `CRM_WEBHOOK_SECRET` | szerver | igen (CRM továbbításhoz) | `X-Webhook-Secret` fejléc; a CRM `WEBHOOK_SECRET`-jével azonos. Ha üres → a CRM-hívás kimarad. |

**A Pixel ID a kliensbe is be van égetve** — lásd `window.SITE_CONFIG.META_PIXEL_ID`
(`index.html` és `koszonjuk-ajanlat/index.html`). Jelenlegi érték: **`4713852072218611`**.

**n8n URL-ek (a `.env.example` szerint):**
- Production: `https://traininghungary.app.n8n.cloud/webhook/36b9ab26-8552-40c3-8fdc-2f3cfc10045c`
- Preview/Development: `https://traininghungary.app.n8n.cloud/webhook-test/36b9ab26-8552-40c3-8fdc-2f3cfc10045c`

---

## 5. Frontend mérési réteg (`index.html`)

### 5.1 SITE_CONFIG (a `<head>`-ben, az első script)

```js
window.SITE_CONFIG = {
  META_PIXEL_ID: '4713852072218611',
  API_LEAD_PATH: '/api/lead',
  THANK_YOU_PATH: '/koszonjuk-ajanlat',
  LEAD_SOURCE: 'leadgen-fb-b2b-landing',
  LEAD_SOURCE_PARTIAL: 'leadgen-fb-b2b-landing-partial',
  PIXEL_CONTENT_NAME: 'Megordiusz B2B követeléskezelés',
  PIXEL_CONTENT_CATEGORY: 'facebook-b2b-leadgen'
};
```

### 5.2 Meta Pixel loader

Standard `fbevents.js` snippet, csak akkor fut, ha `META_PIXEL_ID` ki van töltve. Mount-kor:
`fbq('init', id)` majd `fbq('track', 'PageView')`. Ez minden oldalon (landing + köszönő) jelen van.

### 5.3 Attribúció (last-touch, localStorage, 30 napos TTL)

- **localStorage kulcs:** `lgs_attr`, **TTL:** 30 nap (lejárt rekord törlődik).
- **Gyűjtött tracking paraméterek** (URL `searchParams`):
  `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id`,
  `fbclid`, `gclid`, `msclkid`, `ttclid`, `li_fat_id`.
- Plusz: `landing_url`, `landing_referrer` (`document.referrer`), `captured_at` (ms).
- **Logika (`captureAttribution`, minden oldalbetöltéskor fut):**
  - Ha az URL-en van **bármilyen** tracking paraméter → felülírja a tárolt rekordot (last-touch győz).
  - Ha nincs, de van tárolt → meghagyja, csak `landing_url`/`referrer` backfill, ha hiányzott.
  - Ha sem URL paraméter, sem tárolt rekord → új rekord csak `landing_url` + `referrer` adatokkal.
- **Beküldéskor** a `buildAttributionPayload()` a tárolt mezőkhöz hozzáteszi az aktuális
  `page_url`, `page_path`, `page_referrer` értékeket — ez kerül a body `attribution` mezőjébe.

### 5.4 event_id és Pixel helper

- `generateEventId()`: `crypto.randomUUID()`, fallback `evt_<timestamp>_<random>`.
- `firePixel(name, customData, eventId)`: `fbq('track', name, customData, { eventID })`.

---

## 6. A 6 lépéses lead-form

### 6.1 Lépések, mezők, validáció

| # | kulcs | input | autocomplete | validáció |
|---|---|---|---|---|
| 1 | `nev` | `text` `#lf-nev` | `name` | trim ≥ 2 karakter |
| 2 | `email` | `email` `#lf-email` | `email` | `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| 3 | `telefon` | `tel` `#lf-tel` | `tel` | csak számjegyek: 7–15 db |
| 4 | `ceg` | `text` `#lf-ceg` | `organization` | trim ≥ 2 karakter |
| 5 | `szerep` | radio-rács `[data-name="szerep"]` | — | a `ROLE_OPTIONS` egyike |
| 6 | `osszeg` | radio-rács `[data-name="osszeg"]` | — | a `AMOUNT_OPTIONS` egyike |

**`ROLE_OPTIONS` (5. lépés — szerep):**
`Tulajdonos / ügyvezető`, `Pénzügyi vezető / CFO`, `Könyvelő / főkönyvelő`,
`Értékesítési vezető`, `Egyéb`

**`AMOUNT_OPTIONS` (6. lépés — lejárt számla összege):**
`0 Ft`, `1 Ft – 100 000 Ft`, `100 000 – 500 000 Ft`, `500 000 Ft – 1 000 000 Ft`,
`1 000 000 Ft – 5 000 000 Ft`, `5 000 000 Ft felett`

A radio-csoportok `<button role="radio">` elemek; kiválasztáskor `aria-checked="true"`.

### 6.2 Állapot és vezérlés

- `state = { nev, email, telefon, ceg, szerep, osszeg }` (mind string).
- `stepIndex` (0..5), `submitting`, `partialSent` (csak egyszer küld partialt), `eventId` (mount-kor).
- **Progress bar:** `progressFor(i) = min(1, 0.18 + 0.82 * (i / 6))` → első lépésen ~18%.
- **Headline:** 0. lépés kezdő headline; utolsó lépés „Még 1 lépés."; egyébként „Még N lépés.".
- **`next()`:** validál → hibánál `setError` és marad; jónál `state`-be ír; **ha a `telefon`
  lépésen vagyunk → `sendPartial()`**; majd `stepIndex++` vagy az utolsónál `submit()`.
- **Egyetlen `<form novalidate>`** — `submit` esemény → `next()` (Enter is továbblép).

### 6.3 Részleges mentés — `sendPartial()` (PartialContact)

A **telefon lépés** sikeres validációja után, **egyszer** (`partialSent`):

- `POST /api/lead`, `keepalive: true`.
- Body: `nev`, `email`, `telefon` kitöltve; `ceg`/`szerep`/`osszeg` üres;
  `forras = "leadgen-fb-b2b-landing-partial"`, `partial: true`,
  `beerkezett` ISO timestamp, **külön `event_id`** (új UUID), `event_source_url`, `attribution`.
- Hiba esetén némán elnyelve (best-effort).

### 6.4 Végső beküldés — `submit()` (Lead)

A 6. lépés (`osszeg`) validálása után:

- `POST /api/lead`, body: a teljes `state` + `forras = "leadgen-fb-b2b-landing"`,
  `beerkezett`, **`event_id = eventId`** (mount-kori), `event_source_url`, `attribution`.
- **Sikeres válasznál:** kilő `fbq('track', 'Lead', { content_name, content_category }, { eventID })`
  ugyanazzal az `eventId`-val (CAPI dedup), majd átirányít:
  `/koszonjuk-ajanlat?nev=<keresztnév>`.
- **Hiba esetén:** a szerver `error` üzenetét (vagy magyar fallbacket) mutatja, `submitting=false`
  (újrapróbálható).

---

## 7. Szerveroldali endpoint — `POST /api/lead` (`api/lead.js`)

**Folyamat:**

1. Csak `POST` (egyébként `405`). A body JSON; stringként érkezve is megpróbálja parse-olni.
2. **Validáció (`validateBody`):**
   - Mindig: `nev` ≥ 2, érvényes `email`, `telefon` 7–15 számjegy.
   - Ha `partial !== true`: `ceg` ≥ 2, `szerep` és `osszeg` kötelező.
   - Hiba → `422` magyar üzenettel.
3. Kiolvassa: IP (`x-forwarded-for` első értéke), `User-Agent`, `_fbp`/`_fbc` cookie-k.
4. **A Partner CRM-be innen NEM megy hívás** — azt a kliens intézi a CRM nyilvános
   űrlap-végpontján (lásd 9/A). A válaszban ezt a `crm: { skipped: 'client-public-form' }` jelzi.
5. **n8n továbbítás:** ha `N8N_WEBHOOK_URL` be van állítva, ide POST-olja a teljes bodyt
   kiegészítve `client_ip`, `client_user_agent`, `fbp`, `fbc` mezőkkel. Ha van
   `N8N_WEBHOOK_SECRET`, `Authorization: Bearer` fejléccel.
   - n8n hálózati hiba → `502`; n8n nem-2xx → `502` (status + detail). **Ilyenkor NEM megy ki CAPI esemény.**
6. **CAPI esemény — CSAK sikeres n8n-kézbesítés után** (`sendCapi`), 8 mp timeouttal; a CAPI hibája
   **soha nem blokkolja** a választ (catch-elve). Így a Meta **nem számol be olyan leadet, ami nem érkezett be**.
7. Bevárja a CAPI eredményt, majd `200 { ok: true, capi, crm }` (a `crm` itt mindig
   `{ skipped: 'client-public-form' }`).
8. **Dev mód** (nincs `N8N_WEBHOOK_URL`): a lead kézbesítettnek számít, konzolra logol (a CAPI ettől még fut),
   `200 { ok: true, devMode: true, capi, crm }`.

---

## 8. Meta Conversions API (`sendCapi`)

- **Endpoint:** `https://graph.facebook.com/v21.0/<pixelId>/events?access_token=<token>`.
- Ha hiányzik a pixel ID vagy token → `{ ok:false, skipped:true }` (nem hiba).
- **Csak sikeres n8n-kézbesítés (vagy dev mód) után fut** — lásd 7. szakasz 6. lépés.
- **Event név:** `partial === true` → `PartialContact`, egyébként `Lead`.

**Payload:**
```json
{
  "data": [{
    "event_name": "Lead" | "PartialContact",
    "event_time": <unix sec>,
    "event_id": "<ugyanaz, mint a Pixel track-en>",
    "event_source_url": "<oldal URL>",
    "action_source": "website",
    "user_data": { ... },
    "custom_data": { ... }
  }],
  "test_event_code": "<ha META_TEST_EVENT_CODE be van állítva>"
}
```

**`user_data` (Meta spec szerint hashelve):**
- `em` = email lowercased → SHA-256
- `ph` = csak számjegyek → SHA-256
- `fn` = keresztnév (első token) lowercased → SHA-256
- `ln` = vezetéknév (maradék) lowercased → SHA-256
- `country` = `[SHA-256('hu')]` (hard-kódolva, magyar piac)
- `fbp`, `fbc` = **nem hashelt**, cookie-ból
- `client_ip_address`, `client_user_agent` = szerveroldalról
- Ha nincs `_fbc` cookie, de van `fbclid` az attribúcióban → rekonstruálja:
  `fb.1.<captured_at>.<fbclid>`

**`custom_data`:** `lead_source` (`forras`), `company` (`ceg`), `role` (`szerep`),
`overdue_amount` (`osszeg`), `partial`, és az attribúciós mezők
(`utm_*`, `fbclid`, `gclid`, `msclkid`, `ttclid`, `li_fat_id`). Üres mezők kiszűrve.

**Deduplikáció:** a kliens Pixel `Lead` és a szerver CAPI `Lead` **ugyanazzal az `event_id`-val**
megy ki → a Meta összepárosítja, nem duplázza.

---

## 9. n8n továbbítás

A szerver a teljes lead-payloadot (a kliens body + szerveroldali `client_ip`, `client_user_agent`,
`fbp`, `fbc`) JSON-ként POST-olja az `N8N_WEBHOOK_URL`-re. Innen az n8n flow viszi tovább
(automatizáció, e-mail, értesítés stb.). A CAPI-tól független: a CAPI akkor is fut, ha nincs n8n.

> **Megjegyzés:** ez a hívás **változatlan**. A Partner CRM-be a kliens küld közvetlenül
> (lásd 9/A), az n8n payloadot/headert/flow-t **nem** érinti.

### 9/A. Partner CRM — nyilvános űrlap-végpont (kliensoldali)

A CRM-be **a böngésző küld közvetlenül**, a CRM saját nyilvános űrlap-végpontján keresztül.
(Korábban a szerver hívott egy külön CRM-webhookot; az **meg lett szüntetve**, mert ugyanarról
a leadről második, párhuzamos rekordot hozott létre.)

- **Végpont:** `CRM_FORM_URL` (SITE_CONFIG) — `…/api/public/forms/<form kulcs>`; CORS: `*`.
- **Űrlap-munkamenet:** oldalbetöltéskor egy `GET` adja a `token` + `ts` párost; ezek a
  beküldés `_token` / `_ts` mezői. A végpont **eldobja a token kiadása után azonnal érkező**
  beküldést (bot-védelem) → a kliens kivárja a minimális kitöltési időt (`MIN_DWELL_MS`),
  `403`-ra pedig **friss tokent kér és egyszer újrapróbál**.
- **Részleges mentés:** a telefonszám megadása után `POST` `_partial: "1"` mezővel. A válasz
  `submission` + `resume` értékét a végleges beküldés `_submission` / `_resume` mezőként viszi
  magával → **nem keletkezik második deal**. A végleges küldés bevárja a folyamatban lévő
  részleges mentést (max. 5 mp).
- **Hozzájárulás:** a végpont kötelezően kéri a `_consent` mezőt. A landing designjában nincs
  külön jelölőnégyzet — a form lábszövege szerint maga a küldés a hozzájárulás
  („A küldéssel elfogadja az Adatkezelési tájékoztatót."), ezért a kliens `_consent: "true"`-t küld.
- **Honeypot:** a landing rejtett mezőjének értéke a CRM saját honeypot-kulcsán
  (`website_7b8a47ba`) megy át.

**Mezőtérkép (landing → CRM űrlapmező):**

| Landing mező | CRM mezőkulcs | Megjegyzés |
|---|---|---|
| `nev` | `last_name` | a CRM-űrlapon ez a „Hogy szólítsuk?" mező — a **teljes nevet** küldjük |
| `email` | `email` | |
| `telefon` | `phone` | |
| `ceg` | `company` | |
| `szektor` | `milyen_szerepben` | a CRM-űrlap „Melyik iparágban dolgoznak?" mezője |
| `terulet` | `jelenleg_mekkora_osszegben_van_lejart_sz` | a CRM-űrlap „Mekkora a felület (becsült m²)?" mezője |

> A CRM mezőkulcsai generáltak és **nem beszédesek** (a végpont ezekre validál) — a fenti
> táblázat a mérvadó; a kliensben a `CRM.MAP` objektum tartalmazza ugyanezt.

**Attribúció:** a kliens last-touch attribúció-tárolójából (localStorage) a következő kulcsok
mennek át külön mezőként: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`,
`utm_content`, `utm_id`, `gclid`, `fbclid`, `msclkid`, `ttclid`, `li_fat_id`, `landing_url`,
`landing_referrer`, `page_url`, `page_referrer`.

**Beküldési válasz:** siker = `HTTP 2xx` **és** `{ ok: true }`. A válasz esetleges `redirect`
mezőjét **szándékosan figyelmen kívül hagyjuk**: a köszönőoldalra a landing saját
`?nev=&cr=` paraméterezésű átirányítása visz, amitől a `CompleteRegistration` mérés függ.

**Mérési hook-ok:** sikeres részleges/végleges beküldéskor a form `crm-form-partial`,
illetve `crm-form-submitted` CustomEventet bocsát ki (és meghívja a `window.crmFormPartial` /
`window.crmFormSubmitted` függvényt, ha van). Ezek **szándékosan nem mérnek** — a Pixel-mérés
az `app.js`-ben történik, különben duplán számolna.

---

## 10. Köszönő oldal — `koszonjuk-ajanlat/index.html`

- `<meta name="robots" content="noindex, nofollow">`.
- Saját `SITE_CONFIG` + Pixel loader (PageView).
- `?nev=` query-ből XSS-escape-elt köszöntés.
- **CompleteRegistration CSAK valódi beküldés után**: a landing a `?cr=<egyedi id>` paramétert adja át,
  és a köszönő oldal csak akkor lő `fbq('track', 'CompleteRegistration', …, { eventID: <cr id> })`-t,
  ha van `cr` és az még nem sült el (sessionStorage `cr_fired`). **Csak Pixel, nincs CAPI párja.**
  Frissítésre/visszalépésre **nem ismétlődik**; közvetlen URL-megnyitásra (nincs `cr`) **nem sül el**.
  A `cr` id-t eventID-ként használva a Meta deduplikál, ha mégis kétszer futna.

---

## 11. Esemény-térkép

| Trigger | Pixel event | CAPI event | event_id |
|---|---|---|---|
| Bármely oldal betöltés | `PageView` | — | — |
| Telefon lépés validálva | **nincs** (szándékosan) | `PartialContact` (csak n8n-siker után) | partial saját UUID |
| Form sikeres beküldés | `Lead` | `Lead` (csak n8n-siker után) | **közös** mount-kori `eventId` |
| Köszönő oldal (valódi beküldés után) | `CompleteRegistration` | — | landingről kapott `cr` id (sessionStorage anti-dupla) |

> A `PartialContact`-ra **szándékosan nincs kliens Pixel** — a Meta `Lead` optimalizálós szignálját
> tisztán tartja (csak teljes leadekre), a részleges kontakt szerveroldalon, retargeting/attribúció
> céllal megy ki **külön, nem-„Lead" event_name-mel** (így nem csúszik Lead-szűrőkbe/egyéni konverzióba).

---

## 12. Reprodukciós checklist (nulláról)

1. **Statikus oldalak:** `index.html` (SITE_CONFIG, Pixel loader, attribúciós + form JS) és
   `koszonjuk-ajanlat/index.html` (CompleteRegistration).
2. **`SITE_CONFIG`** beállítása: új `META_PIXEL_ID`, `LEAD_SOURCE`(_PARTIAL), `PIXEL_CONTENT_*`.
3. **Serverless függvény** `api/lead.js` (változatlan logika): validáció + CAPI + n8n.
4. **Env változók** Vercelben: `META_CAPI_ACCESS_TOKEN`, (`NEXT_PUBLIC_)META_PIXEL_ID`,
   `N8N_WEBHOOK_URL`, opcionálisan `N8N_WEBHOOK_SECRET`, `META_TEST_EVENT_CODE`.
5. **n8n flow** a webhookkal (CRM cél).
6. **Lépésszövegek/opciók** (`steps`, `ROLE_OPTIONS`, `AMOUNT_OPTIONS`) brand szerint.
7. A **mérési logika változatlan** maradjon: telefon utáni partial, közös `event_id` Pixel+CAPI,
   attribúciós store, SHA-256 hashelés — ez a mérés hitelességének garanciája.

---

## 13. Fejlesztési javaslatok

Prioritás szerint (🔴 magas, 🟡 közepes, 🟢 nice-to-have).

### 🔴 13.1 Spam-/bot-védelem a `/api/lead`-en
Jelenleg **semmilyen** rate-limit, honeypot vagy CAPTCHA nincs — botok feltölthetik a CRM-et és
elronthatják a CAPI/Pixel jelet (hamis konverziók → rossz kampányoptimalizálás).
**Javaslat:** rejtett honeypot mező + időbélyeg-ellenőrzés (túl gyors kitöltés = bot), és/vagy
Cloudflare Turnstile / hCaptcha. Szerveroldali egyszerű rate-limit IP-re (pl. Upstash/Vercel KV).

### 🔴 13.2 Cookie-/hozzájárulás-kezelés (GDPR)
A Meta Pixel **a PageView-t azonnal, hozzájárulás előtt** elsüti, és a CAPI is hashelt PII-t küld.
EU/magyar piacon ez megfelelőségi kockázat. **Javaslat:** consent banner, és a Pixel + CAPI
csak marketing-hozzájárulás után fusson (Consent Mode-szerű gating).

### 🔴 13.3 Telefonszám E.164 normalizálás a CAPI előtt
A `ph` jelenleg csak `\D`-t töröl. A `06 30…` magyar formátumból `0630…` lesz (rossz match a
Metánál). **Javaslat:** normalizálás E.164-re (vezető 0 → `36`, `+` levágva) a hash előtt — ez
közvetlenül javítja a match quality-t és a kampány-attribúciót.

### 🟡 13.4 Lead-megbízhatóság, ha az n8n elérhetetlen
Ha az n8n nem-2xx-et ad, a lead a kliens-újrapróbáláson kívül **elveszhet** (a CAPI ugyan
lefut). **Javaslat:** tartós tartalék (e-mail értesítés, Vercel KV/queue, vagy másodlagos
webhook), hogy a kontakt soha ne vesszen el; és riasztás (pl. Slack) n8n hibára.

### 🟡 13.5 Biztonsági fejlécek + `vercel.json`
Nincs CSP, HSTS, `X-Content-Type-Options` stb., és nincs explicit routing config.
**Javaslat:** `vercel.json` a security headerekkel és a `/koszonjuk-ajanlat` clean URL
explicit rögzítésével (kevésbé függ a Vercel defaulttól).

### 🟡 13.6 Origin/Referer ellenőrzés az endpointon
A `/api/lead` bárhonnan hívható. **Javaslat:** egyszerű `Origin`/`Referer` allowlist (saját
domain), hogy idegen oldalról ne lehessen a Pixel/CRM-et szennyezni.

### 🟢 13.7 Pixel-konfiguráció központosítása
A `SITE_CONFIG` + Pixel loader **duplikálva** van az `index.html`-ben és a köszönő oldalon →
elcsúszás kockázata (ahogy a Pixel ID korábban hiányzott). **Javaslat:** közös kis JS fájl
(`/assets/pixel.js`), mindkét oldal azt importálja.

### 🟢 13.8 `external_id` a jobb match quality-ért
A CAPI `user_data`-ba felvehető egy stabil, hashelt `external_id` (pl. anonim látogató-id) a
match rate javítására.

### 🟢 13.9 Dokumentáció-szinkron és tesztek
- A `MULTISTEP_FORM_SPEC.md` elavult (`tevekenyseg` vs. `osszeg`, Next.js vs. statikus HTML) —
  érdemes vagy frissíteni, vagy erre a dokumentumra cserélni a hivatkozásokat.
- Nincs automata teszt a `validateBody`-ra és a CAPI payload-építésre — egy könnyű unit-teszt
  réteg (pl. Vitest) megfogná a regressziókat.
- Strukturált logolás/observability a jelenlegi `console.log` helyett.
