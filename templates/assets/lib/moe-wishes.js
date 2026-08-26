/* Moesora Wish Wall (moe-wishes.js) - Shorekeeper Sanctuary Edition
 * Storage: Halo Comments (kind=SinglePage). Category/Color prefix: 【Category|color】
 * Features: English localization, Black Shores ethereal visual theme, glowing cards, responsive scatter layout.
 */
(function () {
  "use strict";
  var API = "/apis/api.halo.run/v1alpha1", GROUP = "content.halo.run", VERSION = "v1alpha1";
  var COLORS = ["blue", "purple", "pink", "green", "orange", "yellow"];

  function getCookie(n) { var m = document.cookie.match("(^|;)\\s*" + n + "\\s*=\\s*([^;]+)"); return m ? decodeURIComponent(m.pop()) : ""; }
  function api(path, opts) {
    opts = opts || {};
    var headers = { Accept: "application/json" };
    if (opts.method && opts.method !== "GET") { headers["Content-Type"] = "application/json"; var x = getCookie("XSRF-TOKEN"); if (x) headers["X-XSRF-TOKEN"] = x; }
    return fetch(API + path, { method: opts.method || "GET", headers: headers, credentials: "same-origin", body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t || ("HTTP " + r.status)); }); return r.status === 204 ? {} : r.json(); });
  }
  function listComments(name, page, size) { return api("/comments?group=" + GROUP + "&version=" + VERSION + "&kind=SinglePage&name=" + encodeURIComponent(name) + "&page=" + page + "&size=" + size); }
  function listReplies(commentName, page, size) { return api("/comments/" + encodeURIComponent(commentName) + "/reply?page=" + page + "&size=" + size); }
  function createComment(name, raw, html, info) {
    return api("/comments", { method: "POST", body: {
      raw: raw, content: html, allowNotification: true,
      subjectRef: { group: GROUP, version: VERSION, kind: "SinglePage", name: name },
      owner: { kind: "Email", name: info.email, displayName: info.nickname, annotations: {} } } });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }
  function htmlToText(h) { var d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || d.innerText || "").trim(); }
  function hashIdx(s, n) { var h = 0, i; s = s || ""; for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h % n; }
  function rnd(seed) { var x = Math.sin(seed * 99991) * 10000; return x - Math.floor(x); }
  function parseMsg(raw, seed) {
    var m = /^\s*【([^|】]{1,20})\|([a-z]+)】([\s\S]*)$/.exec(raw || "");
    if (m && COLORS.indexOf(m[2]) >= 0) return { cat: m[1], color: m[2], text: m[3].trim() };
    return { cat: "", color: COLORS[hashIdx(seed || raw, COLORS.length)], text: (raw || "").trim() };
  }
  function fmtDate(iso) { 
    if (!iso) return ""; 
    var d = new Date(iso); 
    if (isNaN(d)) return ""; 
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); 
  }
  function rawOf(spec) { return spec && spec.raw != null && spec.raw !== "" ? spec.raw : htmlToText(spec && spec.content); }

  function init(root) {
    if (!root || root.dataset.moeMounted === "1") return;
    root.dataset.moeMounted = "1";

    var pageName = root.dataset.name;
    var rawCats = root.dataset.cats || "Wishes,Thoughts,Echoes,Feedback";
    var cats = rawCats.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    if (!cats.length) cats = ["Wishes", "Thoughts", "Echoes", "Feedback"];
    var defaultCat = cats[0] || "Wishes";
    var SIZE = 60, page = 0, curFilter = "__all__", chosenColor = COLORS[0], chosenCat = defaultCat;
    var openEl = null;

    root.innerHTML =
      '<div class="moe-wish-tabs"><button type="button" class="moe-wish-tab is-on" data-f="__all__">✦ All Wishes</button>' +
      cats.map(function (c) { return '<button type="button" class="moe-wish-tab" data-f="' + esc(c) + '">' + esc(c) + '</button>'; }).join("") + '</div>' +
      '<div class="moe-wish-wall" aria-live="polite"></div>' +
      '<div class="moe-wish-state" data-state>Gathering starlit wishes…</div>' +
      '<div class="moe-wish-more" hidden><button type="button" class="moe-wish-more-btn">Load More Wishes</button></div>' +
      '<div class="moe-wish-form">' +
        '<input class="moe-wish-nick" type="text" maxlength="24" placeholder="Codename / Name *">' +
        '<input class="moe-wish-mail" type="email" maxlength="60" placeholder="Email (Optional)">' +
        '<div class="moe-wish-mid">' +
          '<textarea class="moe-wish-ta" maxlength="200" rows="1" placeholder="Whisper a wish"></textarea>' +
          '<span class="moe-wish-count">0/200</span>' +
          '<span class="moe-wish-colors">' + COLORS.map(function (c, i) { return '<button type="button" class="moe-wish-color moe-wish-c-' + c + (i === 0 ? " is-on" : "") + '" data-c="' + c + '" title="' + c + '"></button>'; }).join("") + '</span>' +
          '<div class="moe-wish-catdd">' +
            '<button type="button" class="moe-wish-catbtn" aria-haspopup="listbox" aria-expanded="false"><span class="moe-wish-catval">' + esc(defaultCat) + '</span><svg class="moe-wish-catarrow" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 2 6 6.2 10.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<ul class="moe-wish-catmenu" role="listbox">' + cats.map(function (c, i) { return '<li class="moe-wish-catopt' + (i === 0 ? ' is-on' : '') + '" role="option" data-v="' + esc(c) + '">' + esc(c) + '</li>'; }).join("") + '</ul>' +
          '</div>' +
          '<button type="button" class="moe-wish-send">Send Wish</button>' +
        '</div>' +
      '</div>';

    var wall = root.querySelector(".moe-wish-wall"), stateEl = root.querySelector("[data-state]");
    var moreWrap = root.querySelector(".moe-wish-more"), moreBtn = root.querySelector(".moe-wish-more-btn");
    var nickEl = root.querySelector(".moe-wish-nick"), mailEl = root.querySelector(".moe-wish-mail");
    var taEl = root.querySelector(".moe-wish-ta"), countEl = root.querySelector(".moe-wish-count");
    var sendBtn = root.querySelector(".moe-wish-send");
    var catDd = root.querySelector(".moe-wish-catdd"), catBtn = root.querySelector(".moe-wish-catbtn"), catVal = root.querySelector(".moe-wish-catval");

    function toast(msg, ok) {
      var t = root.querySelector(".moe-wish-toast");
      if (!t) { t = document.createElement("div"); t.className = "moe-wish-toast"; root.appendChild(t); }
      t.textContent = msg; t.classList.toggle("is-err", !ok); t.classList.add("show");
      clearTimeout(t.__h); t.__h = setTimeout(function () { t.classList.remove("show"); }, 3200);
    }
    function emailOk(m) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m); }
    function repliesHtml(items) {
      if (!items.length) return "";
      var lines = items.map(function (r) { return '<div class="moe-wish-reply-line">' + nl2br(rawOf(r.spec || {})) + '</div>'; }).join("");
      return '<div class="moe-wish-replied">✦ Shorekeeper Replied</div>' + lines;
    }

    function closeOpen() { if (openEl) { openEl.classList.remove("is-open"); openEl = null; } }
    function toggleOpen(el) { if (el === openEl) { closeOpen(); return; } closeOpen(); el.classList.add("is-open"); openEl = el; }
    root.addEventListener("click", function () { closeOpen(); });

    function cardNode(item) {
      var spec = item.spec || {}, owner = item.owner || spec.owner || {}, meta = item.metadata || {};
      var seed = (meta.name || "") + (owner.displayName || "");
      var p = parseMsg(rawOf(spec), seed);
      var cat = p.cat || defaultCat;
      var el = document.createElement("article");
      el.className = "moe-wish-card moe-wish-c-" + p.color;
      el.setAttribute("data-cat", cat);
      el.dataset.cn = meta.name;
      el.dataset.seed = String(hashIdx(seed, 100000));
      el.innerHTML =
        '<div class="moe-wish-bar"><span class="moe-wish-dots"><i></i><i></i><i></i></span>' +
        '<span class="moe-wish-cat">' + esc(cat) + '</span></div>' +
        '<div class="moe-wish-text">' + nl2br(p.text) + '</div>' +
        '<div class="moe-wish-reply-wrap" data-replywrap hidden></div>' +
        '<div class="moe-wish-foot"><span class="moe-wish-name">' + esc(owner.displayName || "Anonymous Voyager") + '</span>' +
        '<span class="moe-wish-date">' + esc(fmtDate(spec.creationTime || meta.creationTimestamp)) + '</span></div>';
      el.addEventListener("click", function (e) { e.stopPropagation(); toggleOpen(el); });
      var rc = (item.status && item.status.replyCount) || spec.replyCount || 0;
      if (rc > 0 && meta.name) loadCardReplies(el, meta.name);
      return el;
    }
    function loadCardReplies(el, cn) {
      listReplies(cn, 0, 50).then(function (res) {
        var items = (res && res.items) || []; if (!items.length) return;
        var wrap = el.querySelector("[data-replywrap]");
        wrap.innerHTML = repliesHtml(items); wrap.hidden = false;
        relayout();
      }).catch(function (e) { console.error("[moe-wishes] Failed to load card replies:", e); });
    }

    var relayoutTimer = null;
    function relayout() { clearTimeout(relayoutTimer); relayoutTimer = setTimeout(layout, 60); }
    function layout() {
      var cards = [].slice.call(wall.querySelectorAll(".moe-wish-card")).filter(function (c) { return c.style.display !== "none"; });
      var W = wall.clientWidth || root.clientWidth || 320;
      if (cards.length === 0) {
        wall.style.height = "60px";
        return;
      }

      if (W < 500) {
        // Mobile layout: Compact overlapping stack with alternating gentle tilt
        var cardW = Math.min(290, Math.floor(W * 0.88));
        var pitchY = 120, maxBottom = 0;
        var startX = Math.max(6, Math.floor((W - cardW) / 2));
        cards.forEach(function (c, i) {
          c.style.position = "absolute";
          c.style.width = cardW + "px";
          c.style.margin = "0";
          var sd = +c.dataset.seed || (i * 37 + 11);
          var jx = (rnd(sd) - 0.5) * 16;
          var jy = (rnd(sd + 3) - 0.5) * 12;
          var rot = (i % 2 === 0 ? -2.5 : 2.5) + (rnd(sd + 7) - 0.5) * 2.5;
          var x = Math.max(4, Math.min(W - cardW - 4, startX + jx));
          var y = i * pitchY + jy;
          c.style.left = x + "px";
          c.style.top = y + "px";
          c.style.transform = "rotate(" + rot.toFixed(1) + "deg)";
          c.style.zIndex = String(i + 10);
          var h = c.offsetHeight || 160;
          if (y + h > maxBottom) maxBottom = y + h;
        });
        wall.style.height = (maxBottom + 120) + "px";
        return;
      }

      // Desktop and Tablet: Dense overlapping scatter grid (nằm chồng lên nhau)
      var cardW = Math.min(225, Math.max(195, Math.floor((W - 30) / 4)));
      var overlapX = Math.floor(cardW * 0.28); // ~55-63px overlap between adjacent notes
      var pitchX = cardW - overlapX; // ~140-162px
      var pitchY = 125; // vertical overlap since notes are ~165-200px tall
      
      var cols = Math.max(2, Math.floor((W - overlapX) / pitchX));
      var actualCols = Math.min(cards.length, cols);
      var gridWidth = (actualCols - 1) * pitchX + cardW;
      var startX = Math.max(10, Math.floor((W - gridWidth) / 2));
      
      var maxBottom = 0;
      cards.forEach(function (c, i) {
        c.style.position = "absolute";
        c.style.width = cardW + "px";
        c.style.margin = "0";
        
        var col = i % cols;
        var row = Math.floor(i / cols);
        var sd = +c.dataset.seed || (i * 37 + 11);
        
        // Add subtle row stagger for alternating rows (honeycomb/scattered pinboard look)
        var rowStagger = (row % 2 === 1 && cols > 2) ? Math.floor(pitchX * 0.38) : 0;
        var baseX = startX + col * pitchX + rowStagger;
        if (baseX + cardW > W - 8) {
          baseX = W - cardW - 8;
        }
        
        var jx = (rnd(sd) - 0.5) * 22;
        var jy = (rnd(sd + 3) - 0.5) * 18;
        var rot = (rnd(sd + 7) - 0.5) * 7; // ±3.5deg
        
        var x = Math.max(6, Math.min(W - cardW - 6, baseX + jx));
        var y = Math.max(0, row * pitchY + jy);
        
        c.style.left = x + "px";
        c.style.top = y + "px";
        c.style.transform = "rotate(" + rot.toFixed(1) + "deg)";
        c.style.zIndex = String((i + 1) * 2 + (sd % 4));
        
        var h = c.offsetHeight || 160;
        if (y + h > maxBottom) maxBottom = y + h;
      });
      
      wall.style.height = (maxBottom + 120) + "px";
    }
    var roTimer = null;
    window.addEventListener("resize", function () { clearTimeout(roTimer); roTimer = setTimeout(layout, 120); });

    root.querySelectorAll(".moe-wish-tab").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        root.querySelectorAll(".moe-wish-tab").forEach(function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on"); curFilter = b.dataset.f; closeOpen(); applyFilter();
      });
    });
    function applyFilter() {
      wall.querySelectorAll(".moe-wish-card").forEach(function (c) {
        c.style.display = (curFilter === "__all__" || c.getAttribute("data-cat") === curFilter) ? "" : "none";
      });
      layout();
    }
    root.querySelectorAll(".moe-wish-color").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); root.querySelectorAll(".moe-wish-color").forEach(function (x) { x.classList.remove("is-on"); }); b.classList.add("is-on"); chosenColor = b.dataset.c; });
    });
    catBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = catDd.classList.toggle("is-open");
      if (open) {
        var menu = catDd.querySelector(".moe-wish-catmenu");
        var btnRect = catBtn.getBoundingClientRect();
        var need = menu ? menu.offsetHeight : 180;
        var below = window.innerHeight - btnRect.bottom;
        var dropUp = below < need + 12 && btnRect.top > below;
        catDd.classList.toggle("is-up", dropUp);
      }
      catBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    catDd.querySelectorAll(".moe-wish-catopt").forEach(function (li) {
      li.addEventListener("click", function (e) {
        e.stopPropagation();
        catDd.querySelectorAll(".moe-wish-catopt").forEach(function (x) { x.classList.remove("is-on"); });
        li.classList.add("is-on");
        chosenCat = li.dataset.v;
        catVal.textContent = li.textContent;
        catDd.classList.remove("is-open");
        catBtn.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("click", function (e) {
      if (!catDd.contains(e.target)) { catDd.classList.remove("is-open"); catBtn.setAttribute("aria-expanded", "false"); }
    }, true);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { catDd.classList.remove("is-open"); catBtn.setAttribute("aria-expanded", "false"); }
    });
    taEl.addEventListener("input", function () { countEl.textContent = taEl.value.length + "/200"; taEl.style.height = "auto"; taEl.style.height = Math.min(taEl.scrollHeight, 120) + "px"; });
    root.querySelector(".moe-wish-form").addEventListener("click", function (e) { e.stopPropagation(); });

    function load() {
      stateEl.textContent = page === 0 ? "Gathering starlit wishes…" : ""; stateEl.style.display = "";
      listComments(pageName, page, SIZE).then(function (res) {
        var items = (res && res.items) || [];
        if (page === 0 && items.length === 0) { stateEl.textContent = "No wishes recorded yet. Be the first to cast a thought into the starlight~"; }
        else { stateEl.style.display = "none"; }
        items.forEach(function (it) { wall.appendChild(cardNode(it)); });
        applyFilter();
        requestAnimationFrame(layout);
        var hasNext = res && (res.hasNext != null ? res.hasNext : (res.page + 1 < res.totalPages));
        moreWrap.hidden = !hasNext; if (hasNext) page += 1;
      }).catch(function (e) { stateEl.textContent = "Unable to load wishes. Please try again shortly."; console.error("[moe-wishes] Failed to load:", e); });
    }
    moreBtn.addEventListener("click", function (e) { e.stopPropagation(); load(); });

    function send() {
      var nick = (nickEl.value || "").trim(), text = (taEl.value || "").trim(), mail = (mailEl.value || "").trim();
      if (!nick) { toast("Please enter your codename or name", false); nickEl.focus(); return; }
      if (!text) { toast("Please write your wish", false); taEl.focus(); return; }
      if (mail && !emailOk(mail)) { toast("Invalid email address format", false); mailEl.focus(); return; }
      if (!mail) mail = "wish_" + Date.now() + Math.floor(Math.random() * 1e4) + "@guest.local";
      var raw = "【" + chosenCat + "|" + chosenColor + "】" + text;
      var html = "<p>【" + esc(chosenCat) + "|" + chosenColor + "】" + nl2br(text) + "</p>";
      sendBtn.disabled = true; sendBtn.textContent = "Sending…";
      createComment(pageName, raw, html, { nickname: nick, email: mail }).then(function () {
        taEl.value = ""; countEl.textContent = "0/200"; taEl.style.height = "auto";
        toast("✨ Wish cast into the stars! It will appear once harmonized~", true);
        page = 0; wall.innerHTML = ""; openEl = null; load();
      }).catch(function (e) {
        toast("Failed to cast wish. Please check site comment settings.", false);
        console.error("[moe-wishes] Submission failed:", e);
      }).then(function () { sendBtn.disabled = false; sendBtn.textContent = "Send Wish"; });
    }
    sendBtn.addEventListener("click", function (e) { e.stopPropagation(); send(); });
    taEl.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); send(); } });

    load();
  }

  function boot() { document.querySelectorAll("#moe-wishes[data-name]").forEach(init); }
  window.MoesoraWishes = boot;
  if (document.readyState !== "loading") boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
