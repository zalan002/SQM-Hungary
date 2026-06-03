# 01 — Elemzés és koncepció

**Projekt:** SQM Hungary Kft. — Facebook lead-generációs landing oldal + köszönőoldal
**Megrendelő ügynökség oldaláról:** Training Hungary
**Dátum:** 2026-06-02

Ez a dokumentum összefoglalja a három forrás elemzését (kick-off meeting átirat,
`BACKEND.md` mérési/pipeline-leírás, valamint a [sqm-hungary.hu](https://sqm-hungary.hu/)
oldal tartalma és arculata), és ebből vezeti le a landing oldal koncepcióját, üzeneteit,
szerkezetét és a lead-form logikáját. A **wireframe** (`/wireframe`) és a **design**
(`/design`) ezen elemzés alapján készült.

---

## 1. Cél és kontextus

- **Egyetlen, fókuszált cél:** Facebook (Meta) hirdetésből érkező **B2B érdeklődők
  konvertálása leaddé** egy ajánlatkérő űrlap kitöltésén keresztül.
- A landing oldal **nem** a meglévő weboldal másolata — egy önálló, kampánycélú oldal,
  amelynek minden eleme a lead-konverziót szolgálja (minimális elterelés, erős CTA-k,
  bizalomépítés, kvalifikáló űrlap).
- A folyamat végén egy **köszönőoldal** zár, amely megerősíti a beküldést és beállítja a
  várakozásokat (48 órás visszajelzés).

> A `BACKEND.md` egy **másik** Training Hungary-projekt (Megordiusz, B2B követeléskezelés)
> élő backendjét írja le. Itt **mintaként / referencia-architektúraként** szolgál: a mérési
> és lead-kézbesítési pipeline (statikus HTML + Vercel serverless `api/lead.js`, Meta Pixel +
> Conversions API közös `event_id`-val, n8n webhook, részleges lead mentés, köszönőoldal
> `?nev=` paraméterrel) ugyanígy építhető fel az SQM oldalhoz — csak a **mezők és a tartalom**
> cserélődnek ipari padló B2B kontextusra. A részleteket lásd a 7. pontban.

---

## 2. Kick-off meeting — kulcs-megállapítások

(Forrás: *Training Hungary – Marketing kick off.docx*, 2026-05-20)

| Téma | Megállapítás | Hatás a landingre |
|---|---|---|
| **Stratégia** | Nem találják fel újra a spanyolviaszt — működő iparági sztenderdekre, konkurens-mintákra támaszkodnak. | Bevált, „klasszikus" lead-gen landing szerkezet (hero + form + bizonyíték + USP + szektorok). |
| **Cél** | Az éves forgalom megduplázása; ehhez bejövő leadek kellenek. | Konverzió-orientált oldal, agresszív CTA-elhelyezés. |
| **Célközönség** | **Nagy multicégek** az elsődleges cél, mellettük nagyobb KKV-k. **Lakossági/magánszemély munkát NEM vállalnak.** | Az űrlapnak **ki kell szűrnie a magánszemélyeket** és **kvalifikálnia a nagy projekteket** (cégnév kötelező, m², iparág). |
| **Fő szolgáltatás** | Ipari **műgyanta** padló a bevétel túlnyomó része — ezt keresik/ismerik Magyarországon. | A műgyanta legyen a vezető üzenet és a fő hero-téma. |
| **Speciális anyag** | **PU-cement / poliuretán bevonat** — kevesen ismerik itthon; PVC-s gyártóterületekre (finom összeszerelő, elektronikai gyártás) ideális. | Külön, edukáló szolgáltatás-blokk: „amit más nem kínál". Differenciátor. |
| **Megkülönböztetők** | Más anyagok használata; **nem** építőipari „benzinkutas" stílus, hanem **kulturált megjelenés és kommunikáció**; multiknak értékes, felépített **rendszerek**; nem kötődnek egyetlen anyaggyártóhoz (a legjobb ár/minőség anyaggal dolgoznak); **forintra, egyedileg kalkulált árajánlat** → árelőny. | „Miért az SQM?" blokk ezekkel az érvekkel. A vizuális megjelenés legyen **prémium, letisztult** (nem olcsó építőipari). |
| **Minőség** | Nincs ISO-papír, de **ISO-alapú / vállalatirányítási rendszerek** szerint dolgoznak. | „ISO-alapú minőségbiztosítás" megfogalmazás (a meglévő weboldal is így fogalmaz) — papír nélkül is hiteles. |
| **Bizonyíték** | Multiknak dolgoznak; van fővállalkozói kapcsolat elektronikai gyártásban. | Referencia-logók (Continental, Foxconn, Jabil, NI Hungary, Schaeffler) + valós projektfotók. |
| **Vizuális anyag** | Saját **vektoros logó** + brand-elemek (Drive-ról); **sok fotó** korábbi munkákról (Dropbox/LinkedIn), **videó nincs**. | A `web-optimalizalt/` mappa egy valós kivitelezés fotóit tartalmazza — ezeket használjuk. Logó letöltve a weboldalról. |
| **Lead-kezelés** | A bejövő leadeket telefonos értékesítők kvalifikálják (Pipedrive CRM). | A landing csak az **első szűrést** végzi; a CRM-be (n8n-en át) jut a lead. |

---

## 3. Célközönség és kvalifikáció

**Kit akarunk:** ipari ingatlant üzemeltető **cégek** döntéshozói / műszaki vezetői —
gyártóüzemek, raktárak, élelmiszer- és gyógyszeripari létesítmények, logisztikai központok.

**Kit NEM akarunk:** magánszemély / lakossági (garázs, terasz, lakás).

**Szűrés a formban (a meeting kifejezett kérése):**

1. **Cégnév kötelező mező** → a magánszemélyek nagy része itt lemorzsolódik vagy kiszűrhető.
2. **Becsült felület (m²)** sávokban → a kis (lakossági) projektek elkülönülnek a nagyoktól.
3. **Iparág / szektor** → kizárólag ipari opciók; nincs „lakás/családi ház" opció.

Ezek a CRM-ben és a Meta-optimalizációban is hasznos kvalifikáló adatok.

---

## 4. Értékajánlat és fő üzenetek

**Fő üzenet (hero):** *Műgyanta ipari padlók — minimális leállással.*
(Ezt a meglévő weboldal is így pozícionálja; a meeting megerősíti: a „minimális leállás" a
gyártóüzemeknek a legnagyobb fájdalompont.)

**Alátámasztó üzenetek / USP-k:**

- ⏱️ **48–72 órás visszaállás** — ütemezett kivitelezés, a termelés gyors újraindítása.
- 🛡️ **3 év kivitelezői jótállás.**
- ✅ **ISO-alapú minőségbiztosítás**, élelmiszeripari és egészségügyi megfelelés (HACCP, ESD).
- 🧪 **Speciális anyagok** (epoxi, PU, **PU-cement**, PMMA) — nem kötődünk egy gyártóhoz,
  mindig a projektre optimális rendszert választjuk.
- 💰 **Forintra, egyedileg kalkulált ár** — nem sablon-négyzetméteráras → reális, gyakran
  kedvezőbb ajánlat.
- 🤝 **Multik bizalma** + **kulturált, megbízható kivitelezés** (nem „klasszikus építőipar").
- 🇭🇺 **Országos kivitelezés.**

---

## 5. Arculati alapok (forrás: sqm-hungary.hu)

A design ezt az arculatot **követi** (a wireframe szándékosan arculat nélküli).

| Token | Érték | Megjegyzés |
|---|---|---|
| Márka-sárga (háttér/akcent) | `#FFC928` / `#FFD037` / `#FFDE1D` | A hero és a kiemelő sávok domináns színe. |
| Szöveg / sötét | `#1A1A1A` | Fő szövegszín. |
| Primary gomb háttér | `#121212` | Sötét gomb, fehér felirattal. |
| Kék akcent | `#009AE1` | Visszafogott, másodlagos kiemelés. |
| Világos szekcióháttér | `#F7F7F7` / `#F2F2F2` | Váltakozó szekciók. |
| Tipográfia | **Roboto** (az oldalon `Roboto-Black.ttf`, „CustomFont" néven) | Vastag, ipari karakter. A designban a Roboto család (Black/Bold/Regular). |
| Sarok-lekerekítés | `12–22px` | Kártyák, gombok. |
| Árnyékok | `0 14px 40px rgba(0,0,0,.18)`, `0 4px 10px rgba(0,0,0,.12)` | Lágy, emelt kártyák. |
| Tartalom max-szélesség | `1160px` | |

**Letöltött arculati / kép assetek** (`source-assets/sqm-hungary.hu/`):
`SQMlogo.png` (logó), `32px_tp.png` (favicon), `Roboto-Black.ttf`, és a weboldal fotói
(`factory_hero`, `epoxy_floor`, `factory_laser`, `Esztergom…`, „utána" fotók).

---

## 6. Tartalmi szerkezet (mindkét nézet erre épül)

**Landing oldal (`index.html`):**

1. Fejléc (logó + telefon + 1 db CTA)
2. Hero (fő üzenet + alpontok + CTA + bizalmi mikroszöveg + kép) — **+ ajánlatkérő űrlap belépő**
3. Bizalmi sáv / referencia-logók („Bennünket választottak")
4. USP-sáv (4–6 kulcsérv ikonokkal)
5. „Miért az SQM?" — differenciátorok a meeting alapján
6. Szolgáltatások (Műgyanta padló / PU-cement bevonat / Repedés- és hibajavítás)
7. Folyamat (Felmérés → Egyedi ajánlat → Ütemezett kivitelezés → Üzemátadás)
8. Referenciák / esettanulmányok (valós projektfotókkal)
9. Szektorok (Élelmiszer-HACCP, Logisztika, Gyártás/ESD, Gyógyszer, Egészségügy, Vegyipar, Autóipar, Könnyűipar)
10. **Ajánlatkérő űrlap** (több lépéses, kvalifikáló) — minden CTA ide visz
11. GYIK (kifogáskezelés: leállás, minimum terület, jótállás, anyagok)
12. Lábléc (kapcsolat, GDPR, impresszum)

**Köszönőoldal (`koszonjuk-ajanlat/index.html`):**

1. Megerősítő fejléc (személyre szólóan: „Köszönjük, {Név}!")
2. „Mi a következő lépés?" — 48 órán belül műszaki javaslat + becsült költség
3. Megnyugtatás + közvetlen elérhetőség (telefon, e-mail)
4. „Amíg ránk vár" — készítsen elő 3 fotót + területméretet; rövid bizalmi blokk
5. `noindex, nofollow`

---

## 7. Lead-form logika (backend-kompatibilis)

A `BACKEND.md` mintát követjük: **több lépéses** űrlap, lépésenként egy fókuszált kérdés,
a **telefon lépés** után **részleges mentés** (`LeadPartial`), a végén teljes `Lead` esemény,
majd átirányítás a köszönőoldalra `?nev=<keresztnév>` paraméterrel. Pixel + CAPI **közös
`event_id`-val** deduplikálva.

A mezőkulcsok a backend-mintához igazítva (a `szerep`/`osszeg` helyét ipari-padló-releváns
kvalifikátorok veszik át):

| # | kulcs | kérdés | input | validáció | szerep |
|---|---|---|---|---|---|
| 1 | `nev` | Az Ön neve | text | ≥ 2 karakter | kontakt |
| 2 | `email` | E-mail cím | email | e-mail formátum | kontakt |
| 3 | `telefon` | Telefonszám | tel | 7–15 számjegy | kontakt → **itt fut a részleges mentés** |
| 4 | `ceg` | Cégnév | text | ≥ 2 karakter | **kvalifikáció (lakossági szűrés)** |
| 5 | `szektor` | Iparág / szektor | rádió-rács | a felsorolásból | kvalifikáció |
| 6 | `terulet` | Becsült felület (m²) | rádió-rács | a felsorolásból | kvalifikáció (projektméret) |

**`SZEKTOR_OPCIOK`:** Élelmiszeripar · Gyógyszeripar · Logisztika / Raktár ·
Gyártás / Elektronika (ESD) · Autóipar · Vegyipar · Egyéb ipari

**`TERULET_OPCIOK`:** 100 m² alatt · 100–500 m² · 500–1 000 m² · 1 000–3 000 m² · 3 000 m² felett

> A sorrend (kontakt előbb, kvalifikáció utóbb) megegyezik a `BACKEND.md` bevált mintájával,
> így a részleges-lead logika és a CAPI-deduplikáció változtatás nélkül átemelhető. A
> **kvalifikáló kérdések opcionálisan bővíthetők** (pl. „Projekt típusa: új / felújítás /
> javítás", „Ütemezés"), de a konverzió érdekében 6 lépést tartottunk.

**Mérési térkép (a backend mintából):**

| Trigger | Pixel | CAPI | event_id |
|---|---|---|---|
| Oldalbetöltés (mindkét oldal) | `PageView` | — | — |
| Telefon lépés validálva | — | `LeadPartial` | saját UUID |
| Form sikeres beküldés | `Lead` | `Lead` | közös (mount-kori) |
| Köszönőoldal betöltés | `CompleteRegistration` | — | eldobható UUID |

> A `api/lead.js` serverless függvény, az env-változók és az n8n-flow a `BACKEND.md` szerint
> külön (backend) fázisban készül. Ez a deliverable a **wireframe + design (frontend)** réteget
> tartalmazza; a form a `SITE_CONFIG` + `/api/lead` interfészre van előkészítve.

---

## 8. Asset-leltár — mi van meg és mi hiányzik

**Megvan (felhasználható):**

- ✅ **Logó + favicon** (sqm-hungary.hu).
- ✅ **Roboto-Black** betűtípus.
- ✅ **Valós kivitelezési fotók** (`web-optimalizalt/`, 71 db) — egy high-end élelmiszer-/
  gyógyszeripari üzem műgyanta padlójának kiépítése: önterülő gyanta húzása, kézi elsimítás,
  csapatmunka, elkészült csarnok, nyers beton („előtte"). Lásd a kép-leltárt a
  `02-kepigeny-tablazat.md` elején.
- ✅ A weboldal néhány fotója (gyártóüzem, epoxi padló, lézer).

**Hiányzik / külön kell előállítani:**

- ⚠️ **Referencia-logók** (Continental, Foxconn, Jabil, NI Hungary, Schaeffler) — ezek
  **védjegyzett logók, NEM AI-val generálandók**; az ügyféltől / hivatalos forrásból kell
  bekérni. A designban placeholder logó-dobozok jelzik a helyüket.
- ⚠️ **Néhány kiegészítő / polírozott kép** (pl. social/OG megosztókép, PU-cement elektronikai
  környezetben, GYIK/CTA-hátterek) — ezeket **AI generálja**; a pontos listát és specifikációt
  a `02-kepigeny-tablazat.md` tartalmazza. A designban ezek helyén **placeholder** áll, a kép
  azonosítójával.

---

## 9. Döntések és feltételezések

- A landing **magyar nyelvű**, B2B hangvétel.
- A telefonszám és e-mail a weboldalról: **06 20 208 8779**, **info@sqm-hungary.hu**.
- A nav-menü a lead-gen oldalon **minimalizált** (a klasszikus elterelő menüpontok helyett
  egyetlen „Ajánlatkérés" CTA + telefon), de a fő szekciókra mutató ugrólinkek megmaradnak.
- A design az AI-képek helyén **placeholdert** használ, a meglévő valós fotókat viszont
  beépíti (a megrendelő kifejezett kérése szerint).
