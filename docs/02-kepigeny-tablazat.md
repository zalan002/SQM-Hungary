# 02 — Kép-leltár és kép-igény táblázat

Két rész:

- **A. Meglévő, felhasználható képek** — amiket NEM kell generálni (a weboldalról letöltve
  és a `web-optimalizalt/` mappából). A design ezeket építi be.
- **B. Még szükséges (AI-val generálandó) képek** — minden kép **külön sorban**, pontos
  leírással, képaránnyal és tájolással, hogy egy AI **egyesével, kizárólag az adott képet**
  le tudja generálni. A designban ezek helyén **placeholder** áll, az itteni azonosítóval
  (`AI-01` … `AI-12`).

A C. pontban minden `AI-xx` képhez **kész, bemásolható angol generálási prompt** is van.

---

## A. Meglévő, felhasználható képek (nem kell generálni)

### A.1 — Arculati assetek (sqm-hungary.hu)

| Fájl | Mit ábrázol | Felhasználás | Méret |
|---|---|---|---|
| `SQMlogo.png` | SQM Hungary logó (sárga „SQM" + felirat) | Fejléc, lábléc | 297×154 |
| `32px_tp.png` | Favicon | Böngészőfül | 32×32 |
| `Roboto-Black.ttf` | Márka-betűtípus | Címsorok | — |

### A.2 — Valós kivitelezési fotók (`web-optimalizalt/`, 71 db)

Egy high-end **élelmiszer-/gyógyszeripari üzem** műgyanta padlójának kiépítése.
A designba bemásolt, kurált válogatás (`design/assets/img/foto/`):

| Fájl (design) | Eredeti | Mit ábrázol | Tájolás | Hol használjuk |
|---|---|---|---|---|
| `folyamat-onterules.webp` | 50 | Önterülő gyanta húzása fogazott lehúzóval, közeli | fekvő | Hero / Műgyanta szolgáltatás / Folyamat |
| `folyamat-elsimitas.webp` | 5 | SQM-pólós szakember térdelve simítja a gyantát | álló | „Miért az SQM" / Folyamat |
| `folyamat-reszlet.webp` | 23 | Kézi elsimítás padlólefolyó körül, kék maszkolás | álló | Folyamat / minőség-részlet |
| `csapat-munka.webp` | 26 | Csapat dolgozik a csarnokban, kész fényes padló | álló | Form-szekció / csapat |
| `referencia-elkeszult.webp` | 68 | Elkészült, fényes ipari padló, rozsdamentes gépsor | fekvő | Referencia: élelmiszeripar / Hero alt |
| `elotte-beton.webp` | 71 | Nyers, csupasz betonpadló (kiindulás) | fekvő | „Előtte" / Folyamat: felmérés |

> A mappa további ~65 fotója (csapatmunka, keverés, részletek, csarnokok) tartalék
> a galériához / esettanulmányokhoz. Mind ugyanannak az **egy** élelmiszeripari
> projektnek a fotói — ezért van szükség a B. pont sektor-specifikus képeire.

### A.3 — Weboldal-fotók (`source-assets/sqm-hungary.hu/`)

| Fájl | Mit ábrázol | Megjegyzés |
|---|---|---|
| `factory_hero_800x566.jpg` | Gyártóüzem-enteriőr | tartalék hero/háttér |
| `epoxy_floor_800x566.jpg` | Epoxi padló | tartalék |
| `factory_laser_502x603.jpg` | Lézeres gyártás | tartalék (ESD-hez) |
| `Esztergom-…IMG_3995.jpg`, `harmadik_utana.jpg`, `Utana_*.jpg` | Korábbi „utána" referenciák | tartalék galéria |

---

## B. Még szükséges (AI-val generálandó) képek

**Stílus minden képre (közös):** fotorealisztikus, prémium ipari környezet, természetes/
hideg fehér csarnokvilágítás, tiszta, rendezett, **profi és kulturált** összkép (nem
építkezés-romos), enyhén emelt kontraszt, valós műgyanta-padló textúrák. Kerülendő:
szöveg/feliratok a képen, látható márkalogók, torz kezek, túl telített színek.
A márka-sárga (`#FFC928`) **akcentként** előfordulhat (pl. biztonsági jelölés), de ne
uralja a képet. **Emberek:** ha szerepelnek, sima/semleges munkaruha, arc nem hangsúlyos.

| ID | Elhelyezés (oldal / szekció) | Mit ábrázoljon (pontosan) | Képarány | Tájolás | Ajánlott felbontás | Prioritás |
|---|---|---|---|---|---|---|
| **AI-01** | Megosztókép (Open Graph) — FB/Meta linkelőnézet, `og:image` | Fényes, világosszürke ipari műgyanta padló enyhén rézsútos perspektívából, modern gyártócsarnokban; jobb alsó/üres rész a logónak és rövid feliratnak (a feliratot NEM a kép tartalmazza). Letisztult, prémium hangulat. | **1.91:1** | fekvő | 1200×630 | 🔴 KÖTELEZŐ |
| **AI-02** | Landing / Szolgáltatások — „PU-cement bevonat" kártya | Matt-szatén, világos PU-cement (poliuretán-cement) padló **elektronikai / finom összeszerelő üzemben**: ESD-padló, tiszta összeszerelő sorok, halványkék vagy szürke felület, rozsdamentes munkaállomások. Higiénikus, modern. | **4:3** | fekvő | 1200×900 | 🟠 AJÁNLOTT |
| **AI-03** | Landing / Szolgáltatások — „Repedés- és hibajavítás" kártya | Közeli: ipari betonpadló **dilatációs hézagának / repedésének javítása** — kitöltött, frissen elsimított hézag, mellette szerszám (spakli/kézi simító). Részletgazdag, „minőségi javítás" érzet. | **4:3** | fekvő | 1200×900 | 🟠 AJÁNLOTT |
| **AI-04** | Landing / Esettanulmányok — „ESD / vezetőképes padló" kártya | Tágas **elektronikai gyártócsarnok** sötétebb, vezetőképes (ESD) műgyanta padlóval; finom földelő rézszalag-háló halványan kivehető; tiszta, rendezett gyártósorok. | **3:2** | fekvő | 1500×1000 | 🟠 AJÁNLOTT |
| **AI-05** | Landing / Esettanulmányok — „Raktári / logisztikai padló" kártya | Nagy **logisztikai raktárcsarnok** világosszürke, nagy teherbírású műgyanta padlóval; magasraktári állványok, **targonca** halad, sárga padlójelölő csíkok. | **3:2** | fekvő | 1500×1000 | 🟠 AJÁNLOTT |
| **AI-06** | Landing / Szektorok — gyógyszeripar (opc. szektor-kép) | **Gyógyszeripari tisztatér** makulátlan, fehér, fugamentes műgyanta padlóval; lekerekített fal-padló csatlakozás (hollkél), erős egyenletes világítás, steril hangulat. | **3:2** | fekvő | 1500×1000 | 🟡 NICE-TO-HAVE |
| **AI-07** | Landing / Szektorok — autóipar (opc. szektor-kép) | **Autóipari gyártócsarnok** padlója: nagy terhelésű, fényes szürke epoxi/PU padló, sárga targonca-útvonal jelölések, robotcellák/szerelősor a háttérben. | **3:2** | fekvő | 1500×1000 | 🟡 NICE-TO-HAVE |
| **AI-08** | Landing / Szektorok — vegyipar (opc. szektor-kép) | **Vegyipari üzem** vegyszerálló műgyanta padlója: csővezetékek, tartályok, enyhe csúszásmentes szemcsézés a felületen, ipari lefolyók; tartós, ellenálló összkép. | **3:2** | fekvő | 1500×1000 | 🟡 NICE-TO-HAVE |
| **AI-09** | Landing / Hero — alternatív, „polírozott" háttér (opcionális) | Cinematikus, széles kompozíció: makulátlan, fényes világosszürke műgyanta padló egy modern gyártócsarnokban, mélységélesség-elmosott háttér; bal oldalon nyugodt, üres felület a hero-szövegnek. | **16:9** | fekvő | 1920×1080 | 🟢 OPCIONÁLIS |
| **AI-10** | Köszönőoldal — megerősítő / „mi a következő lépés" kép | Mérnök/szakértő irodai környezetben **műszaki javaslatot / árajánlatot** állít össze: laptop, padló-alaprajz, kéz a dokumentumon; bizalmat sugárzó, tiszta. | **3:2** | fekvő | 1500×1000 | 🟢 OPCIONÁLIS |
| **AI-11** | Landing / USP vagy „Minimális leállás" blokk | **Éjszakai/hétvégi kivitelezés működő üzemben**: részben kész fényes padló, néhány szakember dolgozik, a háttérben üzemkész gépsor — a „termelés gyors újraindítása" üzenet. | **3:2** | fekvő | 1500×1000 | 🟡 NICE-TO-HAVE |
| **AI-12** | Landing / minőség-részlet vagy GYIK | **Csúszásmentes, szemcsézett műgyanta felület makró-közelije**: a szemcseszórás textúrája éles fókuszban, fénylő bevonat. | **1:1** | négyzet | 1200×1200 | 🟡 NICE-TO-HAVE |

> **Megjegyzés a sorrendről:** ha gyorsan kell indulni, a 🔴 + 🟠 jelű képek (AI-01…AI-05)
> elegendőek; a meglévő valós fotók a többi helyet lefedik. A 🟡/🟢 képek a vizuális
> változatosságot és a több-szektoros hirdetési célzást szolgálják.

### B.1 — Nem AI-val előállítandó (külön bekérendő)

| Mi | Miért nem AI | Teendő |
|---|---|---|
| **Referencia-logók**: Continental, Foxconn, Jabil, NI Hungary, Schaeffler | Védjegyzett márkalogók — AI nem reprodukálhatja jogtisztán/pontosan | Ügyféltől / hivatalos „press kit"-ből bekérni (SVG/PNG, átlátszó háttér). A designban placeholder logó-dobozok jelzik a helyet. |
| **Saját vektoros logó variánsok / brand-kézikönyv** | A meetingen említett Drive-mappa tartalma | Ügyféltől bekérni (a meglévő `SQMlogo.png` egyelőre elég). |
| **Hirdetési kreatívok** (FB feed/story képek, videók) | Külön kampány-deliverable, más képarányok (1:1, 4:5, 9:16) | Külön körben, a landing jóváhagyása után. |

---

## C. Kész generálási promptok (angol, bemásolható)

> Mindegyikhez ajánlott hozzáfűzni: *„photorealistic, high-end clean industrial environment,
> cool white facility lighting, professional and tidy, realistic epoxy/PU resin floor texture,
> no text, no visible brand logos, no distorted hands, subtle yellow (#FFC928) safety accents
> only"*.

- **AI-01** — `Wide glossy light-grey industrial resin floor in a modern manufacturing hall, slightly low diagonal perspective, clean premium look, soft reflections, empty calm area on the right for a logo overlay, 1200x630.`
- **AI-02** — `Satin-matte light PU-cement (polyurethane cement) floor in an electronics / fine-assembly cleanroom, ESD flooring, stainless steel assembly workstations, pale blue-grey surface, hygienic and modern, 4:3.`
- **AI-03** — `Close-up of an industrial concrete floor expansion joint / crack being repaired and freshly smoothed, a hand trowel beside it, detailed, high-quality professional repair feel, 4:3.`
- **AI-04** — `Spacious electronics manufacturing hall with a darker conductive ESD resin floor, faint grounding copper-grid pattern visible, clean orderly production lines, 3:2.`
- **AI-05** — `Large logistics warehouse hall with a light-grey heavy-duty resin floor, tall pallet racking, a forklift in motion, yellow floor marking lines, 3:2.`
- **AI-06** — `Pharmaceutical cleanroom with a flawless white seamless resin floor, coved (rounded) wall-to-floor junction, strong even lighting, sterile atmosphere, 3:2.`
- **AI-07** — `Automotive manufacturing hall floor, heavy-duty glossy grey epoxy/PU floor, yellow forklift route markings, robot cells and assembly line in the background, 3:2.`
- **AI-08** — `Chemical plant interior with a chemical-resistant resin floor, pipes and tanks, slight anti-slip texture on the surface, industrial drains, durable look, 3:2.`
- **AI-09** — `Cinematic wide shot of a flawless glossy light-grey resin floor in a modern factory hall, shallow depth of field, calm empty space on the left for hero text, 16:9.`
- **AI-10** — `Engineer in a clean office preparing a technical proposal / quote, laptop, floor plan drawing, hand on document, trustworthy and tidy, 3:2.`
- **AI-11** — `Resin floor installation at night/weekend inside an operating plant, partly finished glossy floor, a few technicians working, production line ready in the background, 3:2.`
- **AI-12** — `Macro close-up of an anti-slip broadcast-grained resin floor surface, sharp texture of the grit, glossy coating, 1:1.`
