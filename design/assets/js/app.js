/* ============================================================
   SQM Hungary — landing frontend logika
   A mérési/lead pipeline a BACKEND.md szerint:
   Meta Pixel + Conversions API közös event_id, attribúció (localStorage),
   több lépéses form, telefon utáni részleges mentés, köszönőoldal ?nev=.
   ------------------------------------------------------------
   FONTOS: a META_PIXEL_ID és az /api/lead serverless függvény élesítése
   külön (backend) fázis. DEMO_MODE=true esetén az űrlap backend nélkül is
   végigvihető (előnézethez); élesben állítsd false-ra.
   ============================================================ */
(function () {
  "use strict";

  window.SITE_CONFIG = window.SITE_CONFIG || {
    META_PIXEL_ID: "",                 // <- éles Pixel ID ide (vagy hagyd üresen teszthez)
    API_LEAD_PATH: "/api/lead",
    THANK_YOU_PATH: "/koszonjuk-ajanlat",
    LEAD_SOURCE: "leadgen-fb-ipari-padlo",
    LEAD_SOURCE_PARTIAL: "leadgen-fb-ipari-padlo-partial",
    PIXEL_CONTENT_NAME: "SQM Hungary ipari padló ajánlatkérés",
    PIXEL_CONTENT_CATEGORY: "facebook-b2b-leadgen-flooring",
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

  function sendPartial() {
    if (partialSent) return; partialSent = true;
    var body = {
      nev: state.nev, email: state.email, telefon: state.telefon,
      ceg: "", szektor: "", terulet: "",
      forras: CFG.LEAD_SOURCE_PARTIAL, partial: true,
      beerkezett: new Date().toISOString(),
      event_id: generateEventId(),
      event_source_url: location.href,
      attribution: buildAttributionPayload()
    };
    try {
      fetch(CFG.API_LEAD_PATH, { method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body), keepalive:true }).catch(function(){});
    } catch (e) {}
  }

  function submit() {
    if (submitting) return; submitting = true;
    elNext.setAttribute("disabled", "disabled"); elErr.textContent = "";
    var body = {
      nev: state.nev, email: state.email, telefon: state.telefon,
      ceg: state.ceg, szektor: state.szektor, terulet: state.terulet,
      forras: CFG.LEAD_SOURCE,
      beerkezett: new Date().toISOString(),
      event_id: eventId,
      event_source_url: location.href,
      attribution: buildAttributionPayload()
    };

    function onSuccess() {
      firePixel("Lead", { content_name: CFG.PIXEL_CONTENT_NAME, content_category: CFG.PIXEL_CONTENT_CATEGORY }, eventId);
      var keresztnev = (state.nev || "").trim().split(/\s+/).pop() || "";
      location.href = CFG.THANK_YOU_PATH + (keresztnev ? "?nev=" + encodeURIComponent(keresztnev) : "");
    }
    function onError(msg) {
      submitting = false; elNext.removeAttribute("disabled");
      elErr.textContent = msg || "Hiba történt a küldés során. Kérjük, próbálja újra, vagy hívjon minket: 06 20 208 8779.";
    }

    if (CFG.DEMO_MODE) { setTimeout(onSuccess, 350); return; } // backend nélküli előnézet

    fetch(CFG.API_LEAD_PATH, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok:r.ok, j:j }; }); })
      .then(function (o) { if (o.ok) onSuccess(); else onError(o.j && o.j.error); })
      .catch(function () { onError(); });
  }

  elNext.addEventListener("click", next);
  elBack.addEventListener("click", back);
  form.addEventListener("submit", function (e) { e.preventDefault(); next(); });

  render();
})();
