/* ============================================================
   SQM Hungary — landing frontend logika
   A mérési/lead pipeline a BACKEND.md szerint:
   Meta Pixel + Conversions API közös event_id, attribúció (localStorage),
   több lépéses form, telefon utáni részleges mentés, köszönőoldal ?nev=.
   ------------------------------------------------------------
   A form HÁTTERE a Partner CRM nyilvános űrlap-végpontja (CRM_FORM_URL): a beküldés
   sikerét ez a válasz dönti el, és a részkitöltés resume-tokenje köti össze a végleges
   küldéssel (egy leadből egy deal). Az /api/lead (n8n → CAPI) hívás VÁLTOZATLAN.
   ------------------------------------------------------------
   FONTOS: a META_PIXEL_ID és az /api/lead serverless függvény élesítése
   külön (backend) fázis. DEMO_MODE=true esetén az űrlap UX-e szimulált (nem
   függ a backend válaszától), de a leadet fire-and-forget elküldi a backendnek
   is → az n8n (és ha be van állítva, a CRM/CAPI) így a dev/előnézet módban is
   megkapja. Élesben állítsd false-ra (szinkron küldés + valódi hibakezelés).
   ============================================================ */
(function () {
  "use strict";

  window.SITE_CONFIG = window.SITE_CONFIG || {
    META_PIXEL_ID: "4713852072218611", // <- éles Pixel ID (a HTML SITE_CONFIG felülírhatja)
    API_LEAD_PATH: "/api/lead",
    THANK_YOU_PATH: "/koszonjuk-ajanlat",
    LEAD_SOURCE: "leadgen-fb-ipari-padlo",
    LEAD_SOURCE_PARTIAL: "leadgen-fb-ipari-padlo-partial",
    PIXEL_CONTENT_NAME: "SQM Hungary ipari padló ajánlatkérés",
    PIXEL_CONTENT_CATEGORY: "facebook-b2b-leadgen-flooring",
    // Partner CRM nyilvános űrlap-végpont — EZ a form "háttere" (lásd lentebb).
    CRM_FORM_URL: "https://partnercrm.leadgensolution.hu/api/public/forms/042b261af69d38431554fd2a534c0ea7",
    CRM_FORM_KEY: "042b261af69d38431554fd2a534c0ea7",
    DEMO_MODE: true                    // <- ÉLESBEN: false
  };
  var CFG = window.SITE_CONFIG;

  /* ---------- Meta Pixel loader (csak ha van ID) ---------- */
  (function loadPixel() {
    if (!CFG.META_PIXEL_ID) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CFG.META_PIXEL_ID);
    window.fbq("track", "PageView");
  })();

  /* ---------- event_id + Pixel helper ---------- */
  function generateEventId() {
    try { return crypto.randomUUID(); }
    catch (e) { return "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2); }
  }
  function firePixel(name, customData, eventId) {
    if (window.fbq) window.fbq("track", name, customData || {}, eventId ? { eventID: eventId } : undefined);
  }

  /* ---------- Attribúció (last-touch, 30 nap TTL) ---------- */
  var ATTR_KEY = "lgs_attr", ATTR_TTL = 30 * 24 * 60 * 60 * 1000;
  var TRACK_KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","utm_id",
                    "fbclid","gclid","msclkid","ttclid","li_fat_id"];
  function captureAttribution() {
    var now = Date.now(), url = new URL(location.href), sp = url.searchParams, found = {};
    TRACK_KEYS.forEach(function (k) { if (sp.get(k)) found[k] = sp.get(k); });
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(ATTR_KEY) || "null"); } catch (e) {}
    if (stored && stored.captured_at && now - stored.captured_at > ATTR_TTL) stored = null;
    var rec;
    if (Object.keys(found).length) {
      rec = Object.assign({}, found, { landing_url: location.href, landing_referrer: document.referrer || "", captured_at: now });
    } else if (stored) {
      rec = stored;
      if (!rec.landing_url) rec.landing_url = location.href;
      if (!rec.landing_referrer) rec.landing_referrer = document.referrer || "";
    } else {
      rec = { landing_url: location.href, landing_referrer: document.referrer || "", captured_at: now };
    }
    try { localStorage.setItem(ATTR_KEY, JSON.stringify(rec)); } catch (e) {}
    return rec;
  }
  function buildAttributionPayload() {
    var rec = captureAttribution();
    return Object.assign({}, rec, { page_url: location.href, page_path: location.pathname, page_referrer: document.referrer || "" });
  }
  captureAttribution();

  /* ---------- Mobil menü ---------- */
  var toggle = document.querySelector(".nav-toggle"), nav = document.querySelector(".nav");
  if (toggle && nav) toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
  document.querySelectorAll('.nav a').forEach(function(a){ a.addEventListener('click', function(){ nav && nav.classList.remove('open'); }); });

  /* ---------- Előtte/utána csúszkák ---------- */
  document.querySelectorAll("[data-ba]").forEach(function (ba) {
    var range = ba.querySelector(".ba-range");
    if (!range) return;
    function update() { ba.style.setProperty("--pos", range.value + "%"); }
    range.addEventListener("input", update);
    range.addEventListener("change", update);
    update();
  });

  /* ---------- Reveal on scroll ---------- */
  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 }) : null;
  document.querySelectorAll(".reveal").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });

  /* ============================================================
     TÖBB LÉPÉSES ŰRLAP
     ============================================================ */
  var form = document.getElementById("lead-form");
  if (!form) return;

  var SECTORS = ["Élelmiszeripar","Gyógyszeripar","Logisztika / Raktár",
                 "Gyártás / Elektronika (ESD)","Autóipar","Vegyipar","Egyéb ipari"];
  var AREAS = ["100 m² alatt","100–500 m²","500–1 000 m²","1 000–3 000 m²","3 000 m² felett"];

  var STEPS = [
    { key:"nev",     type:"text",  label:"Az Ön neve",            placeholder:"pl. Kovács Péter",   autocomplete:"name",
      validate:function(v){ return v.trim().length>=2 || "Kérjük, adja meg a nevét (min. 2 karakter)."; } },
    { key:"email",   type:"email", label:"E-mail cím",            placeholder:"pl. peter@cegnev.hu", autocomplete:"email",
      validate:function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Kérjük, adjon meg egy érvényes e-mail címet."; } },
    { key:"telefon", type:"tel",   label:"Telefonszám",           placeholder:"pl. +36 30 123 4567", autocomplete:"tel",
      validate:function(v){ var d=v.replace(/\D/g,""); return (d.length>=7&&d.length<=15) || "Kérjük, adjon meg egy érvényes telefonszámot."; } },
    { key:"ceg",     type:"text",  label:"Cégnév",                placeholder:"pl. Példa Gyártó Kft.", autocomplete:"organization",
      validate:function(v){ return v.trim().length>=2 || "Kérjük, adja meg a cég nevét."; } },
    { key:"szektor", type:"radio", label:"Melyik iparágban dolgoznak?", options:SECTORS,
      validate:function(v){ return SECTORS.indexOf(v)>=0 || "Kérjük, válasszon egy iparágat."; } },
    { key:"terulet", type:"radio", label:"Mekkora a felület (becsült m²)?", options:AREAS,
      validate:function(v){ return AREAS.indexOf(v)>=0 || "Kérjük, válasszon egy értéket."; } }
  ];

  var state = { nev:"", email:"", telefon:"", ceg:"", szektor:"", terulet:"" };
  function honeypot(){ var el = document.getElementById("lf-hp"); return el ? el.value : ""; }
  var stepIndex = 0, submitting = false, partialSent = false;
  var eventId = generateEventId();

  var elStep = document.getElementById("form-step");
  var elErr = document.getElementById("form-err");
  var elBack = document.getElementById("form-back");
  var elNext = document.getElementById("form-next");
  var elBar = document.getElementById("progress-bar");
  var elLabel = document.getElementById("progress-label");

  function progressFor(i){ return Math.min(1, 0.18 + 0.82 * (i / STEPS.length)); }

  function render(focusInput) {
    var s = STEPS[stepIndex];
    elErr.textContent = "";
    elBar.style.width = (progressFor(stepIndex) * 100).toFixed(0) + "%";
    var remaining = STEPS.length - stepIndex;
    elLabel.textContent = stepIndex === 0 ? "Csak néhány kérdés — kb. 30 másodperc."
      : (remaining === 1 ? "Még 1 lépés." : "Még " + remaining + " lépés.");

    var html = '<div class="field">';
    if (s.type === "radio") {
      html += '<label id="step-label">' + s.label + '</label>';
      html += '<div class="radio-grid' + (s.options.length % 2 ? '' : '') + '" role="radiogroup" aria-labelledby="step-label">';
      s.options.forEach(function (opt) {
        var sel = state[s.key] === opt;
        html += '<button type="button" role="radio" aria-checked="' + (sel ? "true" : "false") + '" data-val="' + opt.replace(/"/g,'&quot;') + '">' + opt + '</button>';
      });
      html += '</div>';
    } else {
      html += '<label for="lf-input">' + s.label + '</label>';
      html += '<input id="lf-input" type="' + s.type + '" inputmode="' + (s.type==="tel"?"tel":(s.type==="email"?"email":"text")) +
              '" autocomplete="' + (s.autocomplete||"on") + '" placeholder="' + s.placeholder + '" value="' + String(state[s.key]).replace(/"/g,'&quot;') + '">';
    }
    html += '</div>';
    elStep.innerHTML = html;

    elBack.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    elNext.textContent = stepIndex === STEPS.length - 1 ? "Ajánlatkérés elküldése" : "Tovább";

    if (s.type === "radio") {
      elStep.querySelectorAll('button[role="radio"]').forEach(function (b) {
        b.addEventListener("click", function () {
          state[s.key] = b.getAttribute("data-val");
          elStep.querySelectorAll('button[role="radio"]').forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
          elErr.textContent = "";
          setTimeout(next, 180); // auto-advance választás után
        });
      });
    } else {
      var inp = document.getElementById("lf-input");
      if (inp) {
        // Csak lépésváltáskor fókuszálunk, és scroll NÉLKÜL — különben az oldal
        // betöltéskor a hero helyett az űrlaphoz ugrana.
        if (focusInput) { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } }
        inp.addEventListener("input", function(){ state[s.key] = inp.value; elErr.textContent=""; });
      }
    }
  }

  function next() {
    if (submitting) return;
    var s = STEPS[stepIndex];
    if (s.type !== "radio") { var inp = document.getElementById("lf-input"); if (inp) state[s.key] = inp.value; }
    var res = s.validate(state[s.key] || "");
    if (res !== true) { elErr.textContent = res; return; }

    if (s.key === "telefon") sendPartial();

    if (stepIndex < STEPS.length - 1) { stepIndex++; render(true); }
    else submit();
  }
  function back() { if (stepIndex > 0) { stepIndex--; render(true); } }

  /* ============================================================
     A FORM HÁTTERE — Partner CRM nyilvános űrlap-végpont
     ------------------------------------------------------------
     Az űrlap designja és lépései VÁLTOZATLANOK; a beküldést a Partner CRM nyilvános
     űrlap-végpontja fogadja (a korábbi, szerveroldali CRM-webhook HELYETT — így egy
     leadből egy deal lesz: a részkitöltés resume-tokenje fűzi össze a végleges küldéssel).
     A Meta-mérés NEM változik: a Pixel `Lead` továbbra is csak SIKERES rögzítés után sül el
     (a siker mércéje most a CRM válasza), a szerveroldali CAPI pedig változatlanul az
     /api/lead-ből megy ki, ugyanazzal az event_id-val → dedup. A köszönőoldali
     `CompleteRegistration` is a megszokott `?cr=` paraméterrel indul, ezért a CRM válaszának
     saját `redirect` mezőjét szándékosan figyelmen kívül hagyjuk.
     ============================================================ */
  var CRM = {
    URL: CFG.CRM_FORM_URL || "",
    KEY: CFG.CRM_FORM_KEY || "",
    // landing mező -> a CRM-űrlap generált mezőkulcsa
    MAP: { nev:"last_name", email:"email", telefon:"phone", ceg:"company",
           szektor:"milyen_szerepben", terulet:"jelenleg_mekkora_osszegben_van_lejart_sz" },
    HP: "website_7b8a47ba",   // a CRM-űrlap saját honeypot mezője
    ATTR: ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id",
           "gclid","fbclid","msclkid","ttclid","li_fat_id",
           "landing_url","landing_referrer","page_url","page_referrer"],
    MIN_DWELL_MS: 3000        // a CRM eldobja a token kiadása után azonnal érkező beküldést
  };

  var crmSessionReq = null, crmResume = null, crmPartialReq = null;

  /* Űrlap-munkamenet (render-token + ts): a CRM ehhez köti a beküldést. Már betöltéskor
     lekérjük, hogy a küldés pillanatában készen álljon. */
  function crmSessionGet(force) {
    if (!CRM.URL) return Promise.resolve(null);
    if (crmSessionReq && !force) return crmSessionReq;
    try {
      crmSessionReq = fetch(CRM.URL, { method:"GET", headers:{ "Accept":"application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (t) { return (t && t.token) ? { token:t.token, ts:t.ts, issued:Date.now() } : null; })
        .catch(function () { return null; });
    } catch (e) { crmSessionReq = null; return Promise.resolve(null); }
    // A SIKERTELEN lekérést nem cache-eljük: egy betöltéskori hálózati hiba miatt ne
    // ragadjon be véglegesen a beküldés — a következő küldés újra megpróbálja.
    return crmSessionReq.then(function (session) {
      if (!session) crmSessionReq = null;
      return session;
    });
  }
  crmSessionGet();

  // Bot-védelem: a tokenhez képest túl gyors beküldést a CRM elutasítja. Élesben ez sosem
  // várakoztat (a token az oldalbetöltéskor megjön), csak villámgyors kitöltésnél tart pár tizedet.
  function crmDwell(session) {
    var w = CRM.MIN_DWELL_MS - (Date.now() - session.issued);
    return w > 0 ? new Promise(function (done) { setTimeout(done, w); }) : Promise.resolve();
  }

  /* Csak a kitöltött mezőértékek, CRM-kulcsokkal. */
  function crmValues() {
    var v = {};
    for (var k in CRM.MAP) { var val = String(state[k] || "").trim(); if (val) v[CRM.MAP[k]] = val; }
    return v;
  }
  function crmPayload(extra) {
    var body = crmValues();
    body._channel = "embed";
    body[CRM.HP] = honeypot();
    // A designban nincs külön jelölőnégyzet: a form lábszövege szerint maga a küldés a
    // hozzájárulás („A küldéssel elfogadja az Adatkezelési tájékoztatót."), a CRM viszont
    // kötelező mezőként kéri.
    body._consent = "true";
    var a = buildAttributionPayload();
    CRM.ATTR.forEach(function (k) { if (a[k]) body[k] = String(a[k]); });
    // Resume-token: a részkitöltés folytatása — enélkül MÁSODIK deal keletkezne.
    if (crmResume) { body._submission = crmResume.submission; body._resume = crmResume.token; }
    if (extra) for (var e in extra) body[e] = extra[e];
    return body;
  }

  function crmPost(extra, retried) {
    if (!CRM.URL) return Promise.resolve({ ok:false, skipped:true });
    return crmSessionGet(!!retried).then(function (session) {
      if (!session) return { ok:false, error:"session" };
      return crmDwell(session).then(function () {
        var body = crmPayload(extra);
        body._token = session.token; body._ts = String(session.ts);
        return fetch(CRM.URL, { method:"POST", headers:{ "Content-Type":"application/json", "Accept":"application/json" },
                                body: JSON.stringify(body) })
          .then(function (r) {
            return r.json().catch(function () { return {}; })
              .then(function (j) { return { ok: r.ok && !!j.ok, status:r.status, j:j }; });
          });
      });
    }).then(function (res) {
      // Lejárt/érvénytelen űrlap-munkamenet → friss token, EGY újrapróbálkozás.
      if (!res.ok && res.status === 403 && !retried) return crmPost(extra, true);
      return res;
    }).catch(function () { return { ok:false, error:"network" }; });
  }

  function crmErrorText(res) {
    // A munkamenet-hibát a saját (magázó) szövegünkkel írjuk ki; a mezőhibákat a CRM adja.
    if (res.status === 403) return "A biztonsági munkamenet lejárt. Kérjük, töltse újra az oldalt, és próbálja újra.";
    return (res.j && res.j.error) || null;
  }

  /* A beágyazó oldal ebből süthetne el saját eseményt. A Pixel-mérés az app.js-ben történik,
     ezért ezek a hook-ok szándékosan NEM mérnek — különben duplán számolna. */
  function crmEmit(type, values) {
    try { form.dispatchEvent(new CustomEvent(type, { bubbles:true, detail:{ key:CRM.KEY, values:values } })); } catch (e) {}
    var fn = (type === "crm-form-partial") ? window.crmFormPartial : window.crmFormSubmitted;
    if (typeof fn === "function") { try { fn(values, CRM.KEY); } catch (e) {} }
  }

  /* Végleges beküldés a CRM-be. Megvárja a folyamatban lévő részleges mentést (a resume-token
     nélkül második deal keletkezne) — de legfeljebb 5 másodpercig, hogy a küldés ne akadjon el. */
  function crmSubmitFinal() {
    var ready = crmPartialReq
      ? Promise.race([crmPartialReq, new Promise(function (r) { setTimeout(r, 5000); })])
      : Promise.resolve();
    return ready.then(function () { return crmPost(); }).then(function (res) {
      if (res.ok) crmEmit("crm-form-submitted", crmValues());
      return res;
    });
  }

  /* /api/lead — n8n továbbítás + szerveroldali Meta CAPI (VÁLTOZATLAN pipeline).
     wait=true: megvárjuk a választ. Egyébként fire-and-forget, keepalive-val — így az
     átirányítás sem szakítja meg a kérést. */
  function postLeadApi(body, wait) {
    var req;
    try {
      req = fetch(CFG.API_LEAD_PATH, { method:"POST", headers:{ "Content-Type":"application/json" },
                                       body: JSON.stringify(body), keepalive: !wait });
    } catch (e) { return Promise.resolve({ ok:false }); }
    if (!wait) { req.catch(function () {}); return Promise.resolve({ ok:true }); }
    return req.then(function (r) { return r.json().then(function (j) { return { ok:r.ok, j:j }; }); });
  }

  /* Részleges mentés a telefonszám után — MINDKÉT kimenet megmarad: a CRM-be a nyilvános
     űrlap-végponton (ez adja a resume-tokent), az /api/lead-re pedig változatlanul
     (n8n + szerveroldali CAPI `PartialContact`). */
  function sendPartial() {
    if (partialSent) return; partialSent = true;
    var body = {
      nev: state.nev, email: state.email, telefon: state.telefon,
      ceg: "", szektor: "", terulet: "", hp: honeypot(),
      forras: CFG.LEAD_SOURCE_PARTIAL, partial: true,
      beerkezett: new Date().toISOString(),
      event_id: generateEventId(),
      event_source_url: location.href,
      attribution: buildAttributionPayload()
    };
    postLeadApi(body);
    crmPartialReq = crmPost({ _partial:"1" }).then(function (res) {
      if (res.ok && res.j && res.j.submission && res.j.resume) {
        crmResume = { submission:res.j.submission, token:res.j.resume };
        crmEmit("crm-form-partial", crmValues());
      }
      return res;
    });
  }

  function submit() {
    if (submitting) return; submitting = true;
    elNext.setAttribute("disabled", "disabled"); elErr.textContent = "";
    var body = {
      nev: state.nev, email: state.email, telefon: state.telefon,
      ceg: state.ceg, szektor: state.szektor, terulet: state.terulet, hp: honeypot(),
      forras: CFG.LEAD_SOURCE,
      beerkezett: new Date().toISOString(),
      event_id: eventId,
      event_source_url: location.href,
      attribution: buildAttributionPayload()
    };

    function onSuccess() {
      firePixel("Lead", { content_name: CFG.PIXEL_CONTENT_NAME, content_category: CFG.PIXEL_CONTENT_CATEGORY }, eventId);
      var keresztnev = (state.nev || "").trim().split(/\s+/).pop() || "";
      // Egyedi azonosító (cr) a köszönő-oldali CompleteRegistration-höz: így az csak VALÓDI
      // beküldés után sül el, és frissítésre/visszalépésre nem ismétlődik (a köszönő oldal
      // sessionStorage-ben jelöli, melyik cr sült már el; a cr eventID-ként is dedupál).
      var qs = [];
      if (keresztnev) qs.push("nev=" + encodeURIComponent(keresztnev));
      qs.push("cr=" + encodeURIComponent(generateEventId()));
      location.href = CFG.THANK_YOU_PATH + "?" + qs.join("&");
    }
    function onError(msg) {
      submitting = false; elNext.removeAttribute("disabled");
      elErr.textContent = msg || "Hiba történt a küldés során. Kérjük, próbálja újra, vagy hívjon minket: 06 20 208 8779.";
    }

    if (CFG.DEMO_MODE) {
      // Dev/előnézet: a UX szimulált (nem függ a válaszoktól), de a leadet a CRM-nek és az
      // /api/lead-nek is elküldjük fire-and-forget módon → az n8n (és ha be van állítva, a
      // CAPI), valamint a CRM így a dev/előnézet módban is megkapja.
      crmSubmitFinal();
      postLeadApi(body);
      setTimeout(onSuccess, 350);
      return;
    }

    if (!CRM.URL) {
      // Nincs CRM-form konfigurálva → marad a korábbi működés: az /api/lead a kapu.
      postLeadApi(body, true)
        .then(function (o) { if (o.ok) onSuccess(); else onError(o.j && o.j.error); })
        .catch(function () { onError(); });
      return;
    }

    // A CRM válasza a kapu: csak sikeres rögzítés után megy ki a Pixel `Lead`, indul az
    // /api/lead (n8n → CAPI) hívás és az átirányítás — így nem mérünk olyan konverziót,
    // ami sehol nem érkezett be.
    crmSubmitFinal().then(function (res) {
      if (!res.ok) { onError(crmErrorText(res)); return; }
      postLeadApi(body);
      onSuccess();
    });
  }

  elNext.addEventListener("click", next);
  elBack.addEventListener("click", back);
  form.addEventListener("submit", function (e) { e.preventDefault(); next(); });

  render();
})();
