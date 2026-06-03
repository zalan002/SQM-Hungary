# SQM Hungary — Facebook lead-generációs landing oldal

Ez a repó az **SQM Hungary Kft.** Facebook (Meta) hirdetésre és lead-generálásra szánt
**landing oldalának + köszönőoldalának** terveit tartalmazza — a megrendelő (Training Hungary)
brief alapján, két fázisban:

1. **Wireframe** (arculat nélkül) — a szerkezet, a tartalom és a folyamat validálására.
2. **Design** — az [sqm-hungary.hu](https://sqm-hungary.hu/) arculatát követve, az AI-val
   generálandó képek helyén **placeholderrel**.

> A teljes elemzés és a döntések indoklása: **[`docs/01-elemzes.md`](docs/01-elemzes.md)**.

---

## Mit nézz meg először?

| Cél | Fájl |
|---|---|
| 🧭 **Elemzés + koncepció** (meeting, célközönség, USP, form-logika) | [`docs/01-elemzes.md`](docs/01-elemzes.md) |
| 🖼️ **Kép-igény táblázat** (mi kell még, AI-prompttal) | [`docs/02-kepigeny-tablazat.md`](docs/02-kepigeny-tablazat.md) |
| 📐 **Wireframe — landing** | [`wireframe/index.html`](wireframe/index.html) |
| 📐 **Wireframe — köszönőoldal** | [`wireframe/koszonjuk-ajanlat/index.html`](wireframe/koszonjuk-ajanlat/index.html) |
| 🎨 **Design — landing** | [`design/index.html`](design/index.html) |
| 🎨 **Design — köszönőoldal** | [`design/koszonjuk-ajanlat/index.html`](design/koszonjuk-ajanlat/index.html) |

A HTML fájlok böngészőben közvetlenül megnyithatók (nincs build lépés). A designban az
űrlap **DEMO módban** fut, így backend nélkül is végigvihető (a beküldés után átirányít a
köszönőoldalra).

---

## Mappaszerkezet

```
.
├── README.md                      ← ez a fájl
├── BACKEND.md                     ← (adott) mérési/lead pipeline referencia
├── Training Hungary - Marketing kick off.docx   ← (adott) kick-off átirat
├── web-optimalizalt/              ← (adott) 71 db valós kivitelezési fotó
│
├── docs/
│   ├── 01-elemzes.md              ← elemzés, koncepció, form-logika
│   └── 02-kepigeny-tablazat.md    ← kép-leltár + AI-kép-igény táblázat
│
├── wireframe/                     ← 1. FÁZIS — arculat nélkül
│   ├── index.html
│   ├── koszonjuk-ajanlat/index.html
│   └── wireframe.css
│
├── design/                        ← 2. FÁZIS — SQM-arculattal
│   ├── index.html
│   ├── koszonjuk-ajanlat/index.html
│   └── assets/
│       ├── css/style.css
│       ├── js/app.js              ← több lépéses form + Pixel/CAPI scaffold
│       ├── fonts/Roboto-Black.ttf
│       └── img/
│           ├── brand/             ← logó, favicon
│           ├── foto/              ← felhasznált VALÓS fotók (kivitelezés)
│           └── placeholder/       ← AI-képek + referencia-logók helye (SVG)
│
└── source-assets/sqm-hungary.hu/  ← a weboldalról letöltött eredeti assetek + CSS-referencia
```

---

## Kép-stratégia (fontos)

- **Valós fotók** ahol van: a `web-optimalizalt/` mappa egy élelmiszeripari üzem műgyanta-padló
  kiépítésének fotóiból, illetve a weboldalról letöltött képekből (`design/assets/img/foto/`).
- **AI-képek beépítve:** a megrendelő által generált képek (`Generált képek/` → bemásolva
  `design/assets/img/ai/AI-01…AI-10.webp`) a helyükre kerültek (OG-kép, PU-cement és
  repedésjavítás szolgáltatáskártya, esettanulmány-képek, köszönőoldal). A specifikáció:
  [`docs/02-kepigeny-tablazat.md`](docs/02-kepigeny-tablazat.md).
- **Referencia-logók:** a Continental, Foxconn, Jabil, NI, Schaeffler logók beépítve
  (`design/assets/img/brand/partners/`, forrás: Wikimedia Commons, szürkeárnyalatos megjelenítés).

---

## Arculat (sqm-hungary.hu nyomán)

- **Színek:** márka-sárga `#FFC928` / `#FFD037`, közel-fekete `#1A1A1A`, fehér; kék akcent `#009AE1`.
- **Tipográfia:** Roboto (címsorokban a letöltött `Roboto-Black`).
- **Stílus:** lágy kártyák, lekerekített sarkok (16–22px), sötét gombok sárga kiemeléssel.

---

## Backend / mérés (ÉLES)

A backend élesítve, a [`BACKEND.md`](BACKEND.md) pipeline szerint:

- **`api/lead.js`** (Vercel serverless) — validáció → Meta Conversions API (`Lead` / telefon
  után `LeadPartial`) → n8n lead-továbbítás. Kliens Pixel + szerver CAPI **közös `event_id`** → dedup.
- **`DEMO_MODE = false`** a `design/index.html`-ben (az űrlap valódi `/api/lead` hívást küld).
- **Honeypot** anti-spam mező a formban.
- **Env változók + élesítési checklist:** [`docs/03-vercel-env.md`](docs/03-vercel-env.md),
  sablon: [`.env.example`](.env.example).

> A Meta **Pixel ID** kliensoldali (a `SITE_CONFIG`-ban, mindkét HTML-ben kell beírni) — lásd a
> `docs/03-vercel-env.md` 2. pontját. A `/api`-t a `vercel.json` külön átengedi a rewrite alól.

---

## Következő lépések / nyitott pontok

1. **Vercel env változók beállítása** + Pixel ID a `SITE_CONFIG`-ban → lásd
   [`docs/03-vercel-env.md`](docs/03-vercel-env.md). (Enélkül az űrlap működik, de a Pixel/CAPI
   nem mér és nincs n8n-továbbítás.)
2. **Esettanulmányok** — kész: 3 db valós **előtte/utána** fotóval (interaktív csúszka),
   az `Esettanulmányok/` mappa alapján. ⚠️ A `.docx`-ek **törzsszövege** több helyen nem a
   mappához tartozó projektet írta le (átemelt/elcsúszott szöveg), ezért a kártyák a
   **konzisztens adatokból** készültek (mappanév + fejléc-adatok + „Összefoglaló" sor). Ha a
   részletes leírásokat is meg akarod jeleníteni, küldd a javított törzsszövegeket.
3. **Production (main):** a javítások a `claude/zen-cerf-Lc2gf` ágon vannak; a production
   domainhez `main`-be kell mergelni (külön jóváhagyással).
4. (Opcionális) Adatkezelési tájékoztató / Impresszum oldalak linkelése a láblécben.
