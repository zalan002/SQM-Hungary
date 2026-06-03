# 03 — Vercel beállítás: környezeti változók és élesítés

Ez a dokumentum összefoglalja, mit kell beállítani a Vercelen ahhoz, hogy a `/api/lead`
backend élesben működjön (Meta Conversions API + n8n lead-továbbítás), és hogy a
Meta Pixel a kliensoldalon is mérjen.

---

## 1. Környezeti változók (Vercel → Project → Settings → Environment Variables)

Add hozzá az alábbiakat. Állítsd be mindhárom környezetre, ahol szükséges
(**Production**, **Preview**, **Development**) — a táblázat „Környezet” oszlopa segít.

| Változó | Kötelező? | Mit állíts be | Honnan szerzed | Környezet |
|---|---|---|---|---|
| `META_PIXEL_ID` | a CAPI-hoz **igen** | A Meta Pixel azonosítója (számsor) | Meta Events Manager → Adatforrások → a Pixel | Production (+ Preview) |
| `META_CAPI_ACCESS_TOKEN` | a CAPI-hoz **igen** | Hosszú élettartamú CAPI token | Events Manager → a Pixel → Settings → **Conversions API → Generate access token** | Production (+ Preview) |
| `META_TEST_EVENT_CODE` | nem | Tesztesemény-kód (pl. `TEST12345`) | Events Manager → **Test events** fül | csak Preview/Development teszthez |
| `N8N_WEBHOOK_URL` | az éles lead-továbbításhoz **igen** | Az n8n webhook **Production** URL-je | n8n → a Webhook node → Production URL | Production |
| `N8N_WEBHOOK_URL` (teszt) | — | Az n8n **Test** webhook URL-je | n8n → Webhook node → Test URL | Preview/Development |
| `N8N_WEBHOOK_SECRET` | nem | Tetszőleges titok; `Authorization: Bearer <secret>` fejlécként megy az n8n felé | te választod (és az n8n-ben ellenőrzöd) | Production (+ Preview) |
| `ALLOWED_ORIGINS` | nem (ajánlott) | Engedélyezett originek vesszővel: `https://sqm-hungary.hu,https://www.sqm-hungary.hu` | a saját éles domain(ek) | Production |

> **Viselkedés env nélkül:**
> - Ha nincs `META_PIXEL_ID` **vagy** `META_CAPI_ACCESS_TOKEN` → a CAPI **kihagyásra kerül**
>   (nem hiba), a lead a többi úton megy tovább.
> - Ha nincs `N8N_WEBHOOK_URL` → **DEV mód**: a szerver csak logol, nem továbbít (a forma
>   ettől még sikeresen lefut és átirányít a köszönőoldalra). Így már a webhook beállítása
>   előtt is tesztelhető a folyamat.
> - Minden változtatás után **Redeploy** szükséges, hogy az env életbe lépjen.

---

## 2. Kliensoldali Pixel ID (NEM env változó!)

A Meta Pixel a böngészőben fut, ezért az ID a **statikus HTML-be** van beégetve, nem a
Vercel env-ből jön. Állítsd be **mindkét** fájlban a `SITE_CONFIG.META_PIXEL_ID` értékét:

- `design/index.html`
- `design/koszonjuk-ajanlat/index.html`

```js
window.SITE_CONFIG = {
  META_PIXEL_ID: "1234567890",   // <-- ide a valós Pixel ID (mindkét fájlba ugyanaz)
  ...
};
```

Amíg üres, a Pixel **nem** tölt be (a CAPI a szerveroldalon ettől még működhet). A pontos
match-quality és a deduplikáció miatt a **kliens Pixel ID és a szerver `META_PIXEL_ID`
legyen ugyanaz**.

---

## 3. Mit jelent az „élesítés” a kódban

- `design/index.html` → `SITE_CONFIG.DEMO_MODE = false` (már beállítva): az űrlap valódi
  `POST /api/lead` hívást küld a DEMO-szimuláció helyett.
- `api/lead.js` (új): validáció → Meta CAPI (`Lead` / telefon után `LeadPartial`) → n8n
  továbbítás. A kliens Pixel `Lead` és a szerver CAPI `Lead` **közös `event_id`**-val megy ki
  → a Meta dedup­likál.
- `vercel.json`: a `/api/*` útvonal explicit átengedve (a statikus rewrite nem érinti).
- **Honeypot anti-spam:** a formban rejtett `website` mező; ha kitöltött (bot), a szerver
  csendben `200`-at ad és **nem** továbbít.

---

## 4. Élesítési checklist

1. [ ] Meta Pixel ID beírva `design/index.html` és `design/koszonjuk-ajanlat/index.html`
   `SITE_CONFIG`-jába.
2. [ ] `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` beállítva a Vercelen (Production).
3. [ ] n8n flow kész, `N8N_WEBHOOK_URL` beállítva (Production = production URL, Preview = test URL).
4. [ ] (Opcionális) `N8N_WEBHOOK_SECRET`, `ALLOWED_ORIGINS`, `META_TEST_EVENT_CODE`.
5. [ ] **Redeploy**.
6. [ ] Teszt: űrlap kitöltése → Events Manager **Test events**-ben látszik a `Lead`
   (és telefon után `LeadPartial`); az n8n-be megérkezik a payload; átirányítás a
   köszönőoldalra `?nev=`-vel.
7. [ ] `META_TEST_EVENT_CODE` eltávolítása élesbenhez (hogy ne a Test events-be menjen).

---

## 5. A leadben érkező mezők (n8n payload)

```
nev, email, telefon, ceg, szektor, terulet,
forras, beerkezett (ISO), event_id, event_source_url,
attribution { utm_*, fbclid, gclid, ..., landing_url, page_url, ... },
client_ip, client_user_agent, fbp, fbc
```
A részleges (telefon utáni) lead: `partial: true`, `forras: "...-partial"`, üres
`ceg/szektor/terulet`, külön `event_id`.
