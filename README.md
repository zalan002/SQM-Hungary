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

- **Valós fotókat** használunk, ahol van: a `web-optimalizalt/` mappa egy élelmiszeripari
  üzem műgyanta-padló kiépítésének fotóiból, illetve a weboldalról letöltött képekből.
- Ahol **új kép kell**, ott a designban **placeholder** áll (`AI-01` … `AI-05`), és a pontos
  specifikáció — *mit ábrázoljon, milyen képaránnyal, kész AI-prompttal* — a
  [`docs/02-kepigeny-tablazat.md`](docs/02-kepigeny-tablazat.md) táblázatban van, **képenként
  külön sorban**.
- A **referencia-logók** (Continental, Foxconn, Jabil, NI Hungary, Schaeffler) védjegyzettek
  → **nem AI-val** készülnek; az ügyféltől bekérendők. A designban placeholder jelzi a helyük.

---

## Arculat (sqm-hungary.hu nyomán)

- **Színek:** márka-sárga `#FFC928` / `#FFD037`, közel-fekete `#1A1A1A`, fehér; kék akcent `#009AE1`.
- **Tipográfia:** Roboto (címsorokban a letöltött `Roboto-Black`).
- **Stílus:** lágy kártyák, lekerekített sarkok (16–22px), sötét gombok sárga kiemeléssel.

---

## Backend / mérés (külön fázis)

A frontend a [`BACKEND.md`](BACKEND.md) pipeline-jára van előkészítve: a `SITE_CONFIG` és a
`/api/lead` interfész adott, az űrlap a Meta Pixel + Conversions API közös `event_id`-os
mérésre és az n8n lead-továbbításra van felépítve (telefon utáni részleges mentés, köszönőoldal
`?nev=`). Élesítéshez szükséges: a `META_PIXEL_ID` beállítása, a `DEMO_MODE=false`, valamint az
`api/lead.js` serverless függvény + env-változók a `BACKEND.md` szerint.

---

## Következő lépések / mire van szükség az ügyféltől

1. **Wireframe jóváhagyása** (szerkezet/tartalom) — utána véglegesíthető a design.
2. **Referencia-logók** (átlátszó PNG/SVG) és a vektoros SQM-logó-variánsok / brand-kézikönyv.
3. **AI-képek legenerálása** a `docs/02-kepigeny-tablazat.md` alapján (vagy valós fotók helyettük).
4. **Esettanulmányok végleges szövege** (kiindulás → megoldás → eredmény, m², üzemátadási idő).
5. **Backend élesítése** (Meta Pixel ID, CAPI token, n8n webhook) a `BACKEND.md` szerint.
