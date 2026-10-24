(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var D = {}; // datos cargados
  var S = { mode: "full", ans: {}, wt: {}, list: [], i: 0, me: null, st: null, ranked: null, hash: "" };
  var CHIPS = [["all", "Todo"], ["cp", "Campañas y dichos"], ["vt", "Votos"], ["pj", "Proyectos"]];

  // ---------- utilidades ----------
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function link(label, url) { var a = el("a", null, label); a.href = url; a.target = "_blank"; a.rel = "noopener"; return a; }
  function fmtDate(iso) { var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function say(msg) { $("status").textContent = ""; setTimeout(function () { $("status").textContent = msg; }, 30); }
  function safe(fn) { try { return fn(); } catch (e) { return null; } }

  var REPO = "https://github.com/ganipa93/cuarto-oscuro";
  function reportLink(what) {
    var a = el("a", "report", "Reportar un error o proponer una fuente");
    a.href = REPO + "/issues/new?title=" + encodeURIComponent("Revisar: " + what) +
      "&body=" + encodeURIComponent("Dato: " + what + "\n\n¿Qué está mal o qué falta?\n\nFuente (enlace):\n");
    a.target = "_blank"; a.rel = "noopener"; return a;
  }

  var views = {};
  [].forEach.call(document.querySelectorAll("[data-view]"), function (v) { views[v.getAttribute("data-view")] = v; });
  function show(name, focusId) {
    for (var k in views) views[k].classList.toggle("on", k === name);
    window.scrollTo(0, 0);
    var f = focusId && $(focusId);
    if (f) f.focus({ preventScroll: true });
  }

  // ---------- tema ----------
  var THEMES = ["auto", "light", "dark"];
  function applyTheme(t) {
    var r = document.documentElement;
    if (t === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", t);
    $("theme").textContent = "Tema: " + (t === "auto" ? "auto" : (t === "light" ? "claro" : "oscuro"));
  }
  var theme = safe(function () { return localStorage.getItem("co-theme"); }) || "auto";
  applyTheme(theme);
  $("theme").addEventListener("click", function () {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % 3];
    applyTheme(theme);
    safe(function () { localStorage.setItem("co-theme", theme); });
  });

  // ---------- carga de datos ----------
  function getJSON(p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }); }
  Promise.all([
    getJSON("data/questions.json"), getJSON("data/parties.json"), getJSON("data/votes.json"),
    getJSON("data/dnu.json"), getJSON("data/timeline.json"), getJSON("data/content.json"), getJSON("data/meta.json"),
    getJSON("data/distritos.json").catch(function () { return null; }),
    getJSON("data/diputados.json").catch(function () { return null; }),
    getJSON("data/historicas.json").catch(function () { return null; })
  ]).then(function (r) {
    D.AX = r[0].axes; D.OPT = r[0].options; D.Q = r[0].questions; D.P = r[1]; D.V = r[2]; D.DNU = r[3]; D.TL = r[4]; D.C = r[5]; D.M = r[6]; D.DIST = r[7]; D.DIP = r[8]; D.HIST = r[9];
    init();
  }).catch(function (e) {
    var b = $("loaderr");
    b.hidden = false;
    b.textContent = "No pude cargar los datos (" + e.message + "). Si abriste el archivo directo desde tu computadora, servilo con un servidor local, por ejemplo: npx serve .";
  });

  function nShort() { return D.Q.filter(function (q) { return q.core; }).length; }

  function init() {
    $("n-short").textContent = nShort() + " afirmaciones · unos 3 minutos";
    $("n-full").textContent = D.Q.length + " afirmaciones · unos 10 minutos";
    $("foot").innerHTML = "";
    $("foot").appendChild(document.createTextNode("Datos relevados hasta el " + fmtDate(D.M.updated) + ". Código y datos abiertos en "));
    $("foot").appendChild(link("GitHub", "https://github.com/ganipa93/cuarto-oscuro"));
    $("foot").appendChild(document.createTextNode(". No es una recomendación de voto."));
    $("start-short").addEventListener("click", function () { startQuiz("short"); });
    $("start-full").addEventListener("click", function () { startQuiz("full"); });
    $("back").addEventListener("click", function () { if (S.i > 0) { S.i--; renderQ(); } });
    $("again").addEventListener("click", function () { location.hash = ""; });
    $("weight").addEventListener("click", function () {
      var q = S.list[S.i]; if (S.wt[q.id]) delete S.wt[q.id]; else S.wt[q.id] = true;
      this.setAttribute("aria-pressed", S.wt[q.id] ? "true" : "false");
    });
    $("toggle").addEventListener("click", function () {
      S.all = !S.all; renderList();
    });
    $("copy").addEventListener("click", copyLink);
    $("png").addEventListener("click", downloadCard);
    $("friend-go").addEventListener("click", compareFriend);
    buildChips("chips", CHIPS, "all", function (v) { $("list").setAttribute("data-filter", v); Array.prototype.forEach.call($("list").querySelectorAll(".pdet"), function (x) { x.open = v !== "all"; }); });
    window.addEventListener("hashchange", route);
    route();
  }

  function buildChips(id, items, cur, cb) {
    var box = $(id); box.innerHTML = "";
    items.forEach(function (it) {
      var b = el("button", "chip", it[1]); b.type = "button";
      b.setAttribute("aria-pressed", it[0] === cur ? "true" : "false");
      b.addEventListener("click", function () {
        [].forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); cb(it[0]);
      });
      box.appendChild(b);
    });
  }

  // ---------- test ----------
  function startQuiz(mode) {
    S.mode = mode; S.ans = {}; S.wt = {}; S.i = 0;
    S.list = D.Q.filter(function (q) { return mode === "full" || q.core; });
    renderQ(); show("quiz", "qtext");
  }
  function renderQ() {
    var q = S.list[S.i];
    $("qnum").textContent = (S.i + 1) + " / " + S.list.length;
    $("bar").style.width = (S.i / S.list.length * 100) + "%";
    $("qtext").textContent = q.t;
    $("back").style.visibility = S.i === 0 ? "hidden" : "visible";
    $("weight").setAttribute("aria-pressed", S.wt[q.id] ? "true" : "false");
    var box = $("opts"); box.innerHTML = "";
    D.OPT.forEach(function (o) {
      var b = el("button", "opt"); b.type = "button";
      b.setAttribute("aria-pressed", S.ans[q.id] === o.v ? "true" : "false");
      b.innerHTML = '<span class="box" aria-hidden="true"></span><span></span>';
      b.lastChild.textContent = o.l;
      b.addEventListener("click", function () {
        S.ans[q.id] = o.v;
        if (S.i < S.list.length - 1) { S.i++; renderQ(); $("qtext").focus({ preventScroll: true }); }
        else { location.hash = encodeHash(); }
      });
      box.appendChild(b);
    });
    say("Pregunta " + (S.i + 1) + " de " + S.list.length);
  }

  function encodeHash() {
    var a = "", w = "";
    D.Q.forEach(function (q) { a += S.ans[q.id] == null ? "-" : String(S.ans[q.id] + 2); w += S.wt[q.id] ? "1" : "0"; });
    return "#r/" + (S.mode === "short" ? "s" : "f") + "/" + a + "/" + w;
  }
  function parseHash(h) {
    var m = /^#r\/([sf])\/([0-4-]+)\/([01]+)$/.exec(h || "");
    if (!m || m[2].length > D.Q.length || m[3].length !== m[2].length) return null;
    // enlaces viejos (con menos preguntas) se completan: las preguntas nuevas van al final
    while (m[2].length < D.Q.length) { m[2] += "-"; m[3] += "0"; }
    var o = { mode: m[1] === "s" ? "short" : "full", ans: {}, wt: {} };
    D.Q.forEach(function (q, k) {
      var c = m[2].charAt(k); if (c !== "-") o.ans[q.id] = Number(c) - 2;
      if (m[3].charAt(k) === "1") o.wt[q.id] = true;
    });
    return o;
  }
  function decodeHash(h) {
    var o = parseHash(h); if (!o) return false;
    S.mode = o.mode; S.ans = o.ans; S.wt = o.wt; return true;
  }

  function score(ans, wt) {
    ans = ans || S.ans; wt = wt || S.wt;
    var sum = [0, 0, 0, 0], den = [0, 0, 0, 0];
    D.Q.forEach(function (q) {
      if (ans[q.id] == null) return;
      var w = wt[q.id] ? 2 : 1;
      sum[q.a] += w * q.s * ans[q.id]; den[q.a] += w;
    });
    return sum.map(function (s, a) { return den[a] ? s / den[a] : 0; });
  }
  function stances(ans) {
    ans = ans || S.ans;
    return D.V.defs.map(function (v) {
      var t = 0, n = 0;
      v.q.forEach(function (x) { if (ans[x[0]] != null) { t += x[1] * ans[x[0]]; n++; } });
      if (!n) return 0;
      var m = t / n; return m >= 0.5 ? 1 : (m <= -0.5 ? -1 : 0);
    });
  }
  function side(v, a) {
    var m = Math.abs(v); if (m < 0.35) return "equilibrado";
    var name = v < 0 ? D.AX[a].lo : D.AX[a].hi;
    return (m > 1.2 ? "marcadamente " : "") + name.toLowerCase();
  }

  // ---------- resultado ----------
  function rank(me, st) {
    return D.P.map(function (p) {
      var d = 0; for (var a = 0; a < 4; a++) d += Math.pow(p.c[a] - me[a], 2);
      d = Math.sqrt(d);
      var ok = 0, n = 0;
      if (p.vv) st.forEach(function (x, k) { var y = p.vv[k]; if (x !== 0 && y != null && y !== 0) { n++; if (x === y) ok++; } });
      return { p: p, pct: Math.round(Math.max(0, 1 - d / 6) * 100), vm: [ok, n] };
    }).sort(function (x, y) { return y.pct - x.pct; });
  }
  function computeResult() {
    S.me = score(); S.st = stances(); S.ranked = rank(S.me, S.st);
  }

  function renderResult() {
    computeResult();
    if (window.va) window.va("event", { name: "resultado" });
    var hl = $("headline"); hl.innerHTML = ""; S.me.forEach(function (v, a) { hl.appendChild(el("span", "hl", D.AX[a].k + ": " + side(v, a))); });
    var ax = $("axes"); ax.innerHTML = "";
    S.me.forEach(function (v, a) {
      var d = el("div", "axis"), pos = (v + 2) / 4 * 100;
      d.innerHTML = '<div class="labels"><span></span><b></b><span></span></div><div class="track"><span class="pin"></span></div><div class="val"></div>';
      d.querySelector(".labels").children[0].textContent = D.AX[a].lo;
      d.querySelector(".labels").children[1].textContent = D.AX[a].k;
      d.querySelector(".labels").children[2].textContent = D.AX[a].hi;
      d.querySelector(".pin").style.left = pos.toFixed(1) + "%";
      d.querySelector(".val").textContent = (v > 0 ? "+" : "") + v.toFixed(1) + " de −2 a +2";
      ax.appendChild(d);
    });
    var nw = Object.keys(S.wt).length, answered = Object.keys(S.ans).length;
    var note = $("shared-note");
    note.hidden = false;
    note.textContent = (S.mode === "short" ? "Versión corta" : "Versión completa") + " · " + answered + " respuestas" + (nw ? " · " + nw + " marcadas como importantes" : "") + ".";
    S.all = false; renderList();
    renderWhy(); $("friend").innerHTML = ""; $("friend-in").value = "";
    renderVotebox(); renderExplorer(); drawMap();
    renderExtra();
  }

  function row(r, top) {
    var p = r.p, d = el("div", "match" + (top ? " top" : ""));
    var nm = el("span", "name", p.n);
    var bd = el("span", "ev " + p.ev.toLowerCase(), p.ev === "A" ? "doc. propio" : (p.ev === "B" ? "estatuto" : "estimado"));
    nm.appendChild(bd);
    var pc = el("span", "pct", r.pct + "%");
    d.appendChild(nm); d.appendChild(pc); d.appendChild(el("span", "tag", p.f)); d.appendChild(el("span", "nt", p.nt));
    if (p.ct) { var c = el("div", "ct"); c.appendChild(el("b", null, "Para mirar con atención")); c.appendChild(document.createTextNode(p.ct)); d.appendChild(c); }
    var det = el("details", "pdet"); det.appendChild(el("summary", null, "Campañas, votos y proyectos")); sections(p, det, r); d.appendChild(det);
    var more = el("div", "more"); more.appendChild(Object.assign(el("a", null, "Ver ficha completa de " + p.n), { href: "#partido/" + p.slug }));
    more.appendChild(document.createTextNode(" · ")); more.appendChild(reportLink("Partido " + p.n));
    d.appendChild(more);
    d.appendChild(el("span", "asof", "Datos al " + fmtDate(p.asof)));
    var br = el("div", "bar"); br.innerHTML = '<i style="width:' + r.pct + '%"></i>'; d.appendChild(br);
    return d;
  }
  function sections(p, d, r) {
    function block(sec, label, text, links) {
      var b = el("div", "cp sec"); b.setAttribute("data-sec", sec);
      b.appendChild(el("b", null, label)); b.appendChild(document.createTextNode(text));
      if (sec === "vt" && r && r.vm && r.vm[1] > 0) {
        b.appendChild(el("div", "vm", "Según tus respuestas, coincidís con su voto en " + r.vm[0] + " de " + r.vm[1] + " votaciones en las que tenés una postura clara."));
      }
      d.appendChild(b);
      if (links && links.length) {
        var l = el("div", "lk"); l.setAttribute("data-sec", sec);
        links.forEach(function (x) { l.appendChild(link(x[0], x[1])); }); d.appendChild(l);
      }
    }
    if (p.cp) block("cp", "Campañas y dichos", p.cp, p.lk);
    if (p.vt) block("vt", "Cómo votan sus legisladores", p.vt, null);
    if (p.pj) block("pj", "Proyectos que presentan", p.pj, p.pl);
    else if (p.vt) block("pj", "Proyectos que presentan", "No encontré proyectos recientes de sus legisladores en fuentes verificables.", null);
  }
  function renderList() {
    var box = $("list"); box.innerHTML = "";
    S.ranked.forEach(function (r, k) { if (k < 5 || S.all) box.appendChild(row(r, k < 3)); });
    $("toggle").textContent = S.all ? "Mostrar menos" : "Ver los 25";
  }

  function renderVotebox() {
    var vb = $("votebox"); vb.innerHTML = "";
    D.V.defs.forEach(function (v, k) {
      var li = el("li");
      var me = S.st[k] === 1 ? "tendrías una postura a favor" : (S.st[k] === -1 ? "tendrías una postura en contra" : "tu postura no es clara");
      var fav = [], con = [];
      D.P.forEach(function (p) { if (p.vv && p.vv[k] === 1) fav.push(p.n); if (p.vv && p.vv[k] === -1) con.push(p.n); });
      li.appendChild(el("b", null, v.n + ": " + me)); li.appendChild(document.createElement("br"));
      li.appendChild(el("span", null, "Según tus respuestas sobre " + v.rel + ". Partidos a favor: " + (fav.join(", ") || "ninguno relevado") + ". En contra: " + (con.join(", ") || "ninguno relevado") + "."));
      vb.appendChild(li);
    });
  }

  // ---------- explorador ----------
  function renderExplorer() {
    var sel = $("vsel");
    if (!sel.options.length) {
      D.V.defs.forEach(function (v) { var o = el("option", null, v.n + " (" + fmtDate(v.date) + ")"); o.value = v.id; sel.appendChild(o); });
      sel.addEventListener("change", showVote);
    }
    showVote();
  }
  function actaTable(box, cam, a) {
    box.appendChild(el("h3", null, cam + ", por bloque: " + a.t + " (" + fmtDate(a.d) + ")"));
    var tx = "Total: " + a.tot[0] + " a favor, " + a.tot[1] + " en contra, " + a.tot[2] + " abstenciones, " + a.tot[3] + " ausentes.";
    box.appendChild(el("p", "small muted", (a.maj ? "Mayoría requerida: " + a.maj + ". " : "") + tx));
    var wrap = el("div", "tablewrap"), t = el("table");
    t.innerHTML = "<thead><tr><th>Bloque</th><th class='n'>Sí</th><th class='n'>No</th><th class='n'>Abst.</th><th class='n'>Aus.</th></tr></thead>";
    var tb = el("tbody");
    a.b.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, k) { tr.appendChild(el("td", k ? "n" : null, String(c))); }); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); box.appendChild(wrap);
    var al = el("p", "small"); al.appendChild(link(cam === "Senado" ? "Ver el acta oficial con el voto de cada senador" : "Ver la votación en el sitio oficial de Diputados", a.u)); box.appendChild(al);
  }

  function showVote() {
    var v = D.V.defs[Number($("vsel").value || 0)], box = $("vdetail"); box.innerHTML = "";
    box.style.cssText = "display:flex;flex-direction:column;gap:12px;margin-top:8px";
    var ul = el("ul", "small notes"); v.res.forEach(function (t) { ul.appendChild(el("li", null, t)); }); box.appendChild(ul);
    var stance = S.st ? S.st[v.id] : 0;
    box.appendChild(el("p", "small", "Con tus respuestas " + (stance === 1 ? "tendrías una postura a favor." : (stance === -1 ? "tendrías una postura en contra." : "tu postura no es clara."))));
    if (v.links && v.links.length) { var l = el("div", "lk"); l.style.cssText = "display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.88rem"; v.links.forEach(function (x) { l.appendChild(link(x[0], x[1])); }); box.appendChild(l); }
    var any = false;
    if (v.acta && D.V.actas[v.acta]) { actaTable(box, "Senado", D.V.actas[v.acta]); any = true; }
    (v.actasD || []).forEach(function (k) { var x = D.DIP && D.DIP.actas[k]; if (x) { actaTable(box, "Diputados", x); any = true; } });
    if (!any) box.appendChild(el("p", "small muted", "No tengo el acta nominal de esta votación: las cifras salen de la prensa."));
    if (D.DIP && (v.actasD || []).length) box.appendChild(el("p", "small muted", "Diputados: " + D.DIP.nota + " Fuente: votaciones nominales oficiales de Diputados (votaciones.hcdn.gob.ar)."));
    box.appendChild(Object.assign(el("p", "small"), {})).appendChild(reportLink("Votación " + v.n));
    var pl = D.P.filter(function (p) { return p.vv && p.vv[v.id] != null; });
    if (pl.length) {
      box.appendChild(el("h3", null, "Cómo se alinean los partidos con legisladores"));
      var u2 = el("ul", "small notes");
      pl.forEach(function (p) {
        var x = p.vv[v.id], txt = x === 1 ? "a favor" : (x === -1 ? "en contra" : "dividido o con abstenciones");
        var li = el("li"); li.appendChild(el("b", null, p.n + ": ")); li.appendChild(document.createTextNode(txt + ". "));
        li.appendChild(Object.assign(el("a", null, "ficha"), { href: "#partido/" + p.slug })); u2.appendChild(li);
      });
      box.appendChild(u2);
    }
  }

  // ---------- mapa ----------
  function drawMap() {
    var me = S.me, topNames = S.ranked.slice(0, 3).map(function (r) { return r.p.n; });
    var W = 560, H = 440, L = 44, R = 16, T = 16, B = 44, iw = W - L - R, ih = H - T - B;
    function X(e) { return L + (e + 2) / 4 * iw; }
    function Y(v) { return T + (2 - v) / 4 * ih; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mapa de partidos en los ejes de economía y valores. Los tres partidos más cercanos son ' + topNames.join(", ") + '.">';
    s += '<rect x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" fill="none" class="linef" stroke-width="1"/>';
    s += '<line x1="' + X(0) + '" y1="' + T + '" x2="' + X(0) + '" y2="' + (T + ih) + '" class="linef" stroke-width="1"/>';
    s += '<line x1="' + L + '" y1="' + Y(0) + '" x2="' + (L + iw) + '" y2="' + Y(0) + '" class="linef" stroke-width="1"/>';
    s += '<text x="' + L + '" y="' + (H - 18) + '" font-size="12" class="mutedf">← Estado presente</text>';
    s += '<text x="' + (L + iw) + '" y="' + (H - 18) + '" font-size="12" text-anchor="end" class="mutedf">Mercado libre →</text>';
    s += '<text x="' + (L + iw / 2) + '" y="' + (H - 4) + '" font-size="12" text-anchor="middle" class="ink">Economía</text>';
    s += '<text x="12" y="' + (T + 12) + '" font-size="12" class="mutedf" transform="rotate(-90 12 ' + (T + 12) + ')" text-anchor="end">Conservador →</text>';
    s += '<text x="12" y="' + (T + ih) + '" font-size="12" class="mutedf" transform="rotate(-90 12 ' + (T + ih) + ')">← Progresista</text>';
    D.P.forEach(function (p) {
      var x = X(p.c[0]), y = Y(p.c[1]), isTop = topNames.indexOf(p.n) > -1;
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + (isTop ? 6 : 4.5) + '" fill="' + (isTop ? "var(--accent)" : "var(--muted)") + '" fill-opacity="' + (isTop ? 1 : 0.55) + '"><title>' + p.n + '</title></circle>';
      if (isTop) {
        var right = x < L + iw * 0.7;
        s += '<text x="' + (right ? x + 10 : x - 10) + '" y="' + (y + 4) + '" font-size="12" font-weight="600" text-anchor="' + (right ? "start" : "end") + '" class="ink">' + p.n + '</text>';
      }
    });
    var mx = X(me[0]), my = Y(me[1]);
    s += '<circle cx="' + mx + '" cy="' + my + '" r="9" fill="var(--mark)" stroke="var(--paper)" stroke-width="3"/>';
    s += '<text x="' + mx + '" y="' + (my - 15) + '" font-size="13" font-weight="700" text-anchor="middle" fill="var(--mark)">Vos</text></svg>';
    $("map").innerHTML = s;
  }

  // ---------- fuentes y alcance ----------
  function listCard(title, items, extra) {
    var c = el("details", "card fold"); var sm = el("summary"); sm.appendChild(el("h3", null, title)); c.appendChild(sm);
    if (extra) c.appendChild(extra);
    var ul = el("ul", "small muted notes"); items.forEach(function (h) { var li = el("li"); li.innerHTML = h; ul.appendChild(li); });
    c.appendChild(ul); return c;
  }
  function renderExtra() {
    var box = $("extra"); box.innerHTML = "";
    box.style.cssText = "display:flex;flex-direction:column;gap:20px";
    box.appendChild(listCard("Qué campañas están relevadas", D.C.scope));
    var nota = el("p", "small muted", "Las actas del Senado muestran el voto de cada senador y el conteo por bloque. Los bloques del Senado no son partidos: \"Justicialista\" y \"Frente PRO\" se asignaron al PJ y al PRO, y los bloques provinciales no se asignaron a ningún partido de la lista. Las tablas de Diputados por bloque salen de las votaciones nominales oficiales de Diputados (votaciones.hcdn.gob.ar); los totales coinciden con los de la prensa. En Diputados los bloques tampoco son partidos.");
    box.appendChild(listCard("Senado: votos nominales relevados", D.C.senado, nota));
    box.appendChild(listCard("Votaciones del Congreso consideradas", D.C.congreso));
    box.appendChild(listCard("Documentos consultados", D.C.docs));
  }

  // ---------- ficha de partido ----------
  function renderParty(slug) {
    var p = D.P.filter(function (x) { return x.slug === slug; })[0], box = $("pcard");
    box.innerHTML = "";
    if (!p) { box.appendChild(el("p", null, "No encontré ese partido.")); box.appendChild(Object.assign(el("a", null, "Volver al inicio"), { href: "#" })); show("party"); return; }
    var back = Object.assign(el("a", null, S.hash ? "← Volver a tu resultado" : "← Volver al inicio"), { href: S.hash || "#" });
    box.appendChild(back);
    var h = el("h2", null, p.n); h.id = "p-name"; h.tabIndex = -1; box.appendChild(h);
    var sub = el("p", "muted", p.f + " · "); sub.appendChild(el("span", "ev " + p.ev.toLowerCase(), p.ev === "A" ? "doc. propio" : (p.ev === "B" ? "estatuto" : "estimado"))); box.appendChild(sub);
    var r = S.ranked && S.ranked.filter(function (x) { return x.p === p; })[0];
    if (r) box.appendChild(el("p", null, "Afinidad con tu resultado: " + r.pct + "%" + (r.vm[1] ? ". Coincidís con su voto en " + r.vm[0] + " de " + r.vm[1] + " votaciones en las que tenés postura clara." : ".")));
    box.appendChild(el("p", "small muted", p.nt));
    if (p.ct) { var c = el("div", "match"); var ct = el("div", "ct"); ct.appendChild(el("b", null, "Para mirar con atención")); ct.appendChild(document.createTextNode(p.ct)); c.appendChild(ct); box.appendChild(c); }
    box.appendChild(el("h3", null, "Ubicación estimada"));
    var co = el("div", "coords");
    D.AX.forEach(function (a, k) {
      var line = el("div", "coord"); line.appendChild(el("span", null, a.k));
      var tr = el("div", "tr"); var dot = el("i"); dot.style.left = ((p.c[k] + 2) / 4 * 100) + "%"; tr.appendChild(dot);
      if (S.me) { var m = el("i", "me"); m.style.left = ((S.me[k] + 2) / 4 * 100) + "%"; tr.appendChild(m); }
      line.appendChild(tr); line.appendChild(el("span", null, (p.c[k] > 0 ? "+" : "") + p.c[k])); co.appendChild(line);
    });
    box.appendChild(co);
    if (S.me) box.appendChild(el("p", "small muted", "Punto azul: el partido. Punto naranja: vos."));
    var holder = el("div", "match"); holder.style.cssText = "display:flex;flex-direction:column;gap:12px;border:0";
    sections(p, holder, r); box.appendChild(holder);
    if (p.vv) {
      box.appendChild(el("h3", null, "Votaciones relevadas"));
      var ul = el("ul", "small notes");
      D.V.defs.forEach(function (v) {
        var x = p.vv[v.id]; if (x == null) return;
        var li = el("li"); li.appendChild(el("b", null, v.n + ": ")); li.appendChild(document.createTextNode(x === 1 ? "a favor" : (x === -1 ? "en contra" : "dividido o con abstenciones"))); ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    var ac = el("p", "small");
    ac.appendChild(Object.assign(el("a", null, "Comparar con otro partido"), { href: "#comparar/" + p.slug + "/" + (D.P[0].slug === p.slug ? D.P[1].slug : D.P[0].slug) }));
    ac.appendChild(document.createTextNode(" · ")); ac.appendChild(reportLink("Partido " + p.n)); box.appendChild(ac);
    box.appendChild(el("p", "small muted", "Datos relevados hasta el " + fmtDate(p.asof) + ". No es una recomendación de voto."));
    show("party", "p-name"); document.title = p.n + " · Cuarto Oscuro";
  }

  // ---------- línea de tiempo ----------
  var tlFilter = "all";
  function renderTimeline() {
    $("tl-note").textContent = D.TL.nota;
    var temas = ["all"]; D.TL.items.forEach(function (i) { if (temas.indexOf(i.tema) < 0) temas.push(i.tema); });
    buildChips("tl-chips", temas.map(function (t) { return [t, t === "all" ? "Todos" : t]; }), tlFilter, function (v) { tlFilter = v; fillTL(); });
    fillTL();
    var box = $("dnucard"); box.innerHTML = "";
    var c = el("div", "card"); c.appendChild(el("h3", null, "Decretos de necesidad y urgencia por presidente"));
    c.appendChild(el("p", "small muted", "No existe un listado único de todos los decretos que pueda resumirse acá: son cientos y varían por metodología. Lo que sigue son las cifras que pude verificar."));
    var wrap = el("div", "tablewrap"), t = el("table");
    t.innerHTML = "<thead><tr><th>Presidente</th><th class='n'>DNU</th><th>Dato</th></tr></thead>";
    var tb = el("tbody"); D.DNU.rows.forEach(function (r) { var tr = el("tr"); tr.appendChild(el("td", null, r[0])); tr.appendChild(el("td", "n", r[1])); tr.appendChild(el("td", null, r[2])); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); c.appendChild(wrap);
    var ul = el("ul", "small muted notes"); D.DNU.notes.forEach(function (h) { var li = el("li"); li.innerHTML = h; ul.appendChild(li); }); c.appendChild(ul);
    box.appendChild(c);
    renderHist();
    show("timeline", "t-tl"); document.title = "Leyes y decretos · Cuarto Oscuro";
  }
  function renderHist() {
    var card = $("histcard");
    if (!D.HIST) { card.hidden = true; return; }
    card.hidden = false;
    $("hist-note").textContent = D.HIST.nota + " Fuente: votaciones nominales oficiales de Diputados (votaciones.hcdn.gob.ar).";
    var sel = $("hsel");
    if (!sel.options.length) {
      D.HIST.items.forEach(function (it, k) { var o = el("option", null, it.n); o.value = k; sel.appendChild(o); });
      sel.addEventListener("change", fillHist);
    }
    fillHist();
  }
  function fillHist() {
    var it = D.HIST.items[Number($("hsel").value || 0)], box = $("hdetail"); box.innerHTML = "";
    box.style.cssText = "display:flex;flex-direction:column;gap:12px;margin-top:8px";
    if (it.nota) box.appendChild(el("p", "small muted", it.nota));
    it.actas.forEach(function (a) { actaTable(box, a.cam === "D" ? "Diputados" : "Senado", a); });
    box.appendChild(el("p", "small")).appendChild(reportLink("Votación histórica " + it.n));
  }

  function fillTL() {
    var ol = $("tl"); ol.innerHTML = "";
    D.TL.items.forEach(function (i) {
      if (tlFilter !== "all" && i.tema !== tlFilter) return;
      var li = el("li"), w = el("div", "when", fmtDate(i.d)); w.appendChild(el("span", "tag", i.tema)); li.appendChild(w);
      li.appendChild(el("h3", null, i.t)); li.appendChild(el("p", "small", i.e));
      var l = el("div"); l.style.cssText = "display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.85rem;margin-top:4px";
      i.src.forEach(function (x) { l.appendChild(link(x[0], x[1])); }); li.appendChild(l); ol.appendChild(li);
    });
  }


  // ---------- qué pesó más ----------
  function renderWhy() {
    var box = $("why"); box.innerHTML = "";
    var den = [0, 0, 0, 0], labels = {};
    D.OPT.forEach(function (o) { labels[o.v] = o.l; });
    D.Q.forEach(function (q) { if (S.ans[q.id] != null) den[q.a] += S.wt[q.id] ? 2 : 1; });
    D.AX.forEach(function (ax, a) {
      var items = D.Q.filter(function (q) { return q.a === a && S.ans[q.id] != null && S.ans[q.id] !== 0; }).map(function (q) {
        return { q: q, c: (S.wt[q.id] ? 2 : 1) * q.s * S.ans[q.id] / den[a] };
      }).sort(function (x, y) { return Math.abs(y.c) - Math.abs(x.c); }).slice(0, 2);
      var h = el("h3", null, ax.k + " (" + side(S.me[a], a) + ")"); box.appendChild(h);
      if (!items.length) { box.appendChild(el("p", "small muted", "Sin respuestas que te muevan de este eje.")); return; }
      var ul = el("ul", "small notes");
      items.forEach(function (it) {
        var li = el("li");
        li.appendChild(document.createTextNode("“" + it.q.t + "” — respondiste: " + labels[S.ans[it.q.id]] + (S.wt[it.q.id] ? " (marcada como importante)" : "") + ". Empuja hacia " + (it.c * 1 > 0 ? ax.hi : ax.lo).toLowerCase() + "."));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });
  }

  // ---------- comparar con otra persona ----------
  function compareFriend() {
    var box = $("friend"); box.innerHTML = "";
    // acepta los dos formatos: …/#r/s/…/… (viejo) y …/r/s/…/… (el que se comparte ahora)
    var m = /(?:#|\/)r\/([sf]\/[0-4-]+\/[01]+)/.exec($("friend-in").value);
    var o = m && parseHash("#r/" + m[1]);
    if (!o) { box.appendChild(el("p", "err", "No reconozco ese enlace. Tiene que ser un enlace de resultado de este sitio (con /r/…).")); return; }
    var me2 = score(o.ans, o.wt), st2 = stances(o.ans), r2 = rank(me2, st2);
    var d = 0; for (var a = 0; a < 4; a++) d += Math.pow(S.me[a] - me2[a], 2);
    var pct = Math.round(Math.max(0, 1 - Math.sqrt(d) / 6) * 100);
    box.appendChild(el("p", null, "Cercanía entre ustedes: " + pct + "% (calculada igual que la de los partidos)."));
    var wrap = el("div", "tablewrap"), t = el("table");
    t.innerHTML = "<thead><tr><th>Eje</th><th class='n'>Vos</th><th class='n'>La otra persona</th></tr></thead>";
    var tb = el("tbody");
    D.AX.forEach(function (ax, k) {
      var tr = el("tr"); tr.appendChild(el("td", null, ax.k));
      tr.appendChild(el("td", "n", (S.me[k] > 0 ? "+" : "") + S.me[k].toFixed(1) + " " + side(S.me[k], k)));
      tr.appendChild(el("td", "n", (me2[k] > 0 ? "+" : "") + me2[k].toFixed(1) + " " + side(me2[k], k))); tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); box.appendChild(wrap);
    box.appendChild(el("p", "small muted", "Partidos más cercanos de la otra persona: " + r2.slice(0, 3).map(function (r) { return r.p.n + " (" + r.pct + "%)"; }).join(", ") + "."));
    say("Comparación lista");
  }

  // ---------- comparar partidos ----------
  function renderCompare(sa, sb) {
    var A = $("cmp-a"), B = $("cmp-b");
    if (!A.options.length) {
      D.P.forEach(function (p) { [A, B].forEach(function (s) { var o = el("option", null, p.n); o.value = p.slug; s.appendChild(o); }); });
      var go = function () { location.hash = "#comparar/" + A.value + "/" + B.value; };
      A.addEventListener("change", go); B.addEventListener("change", go);
    }
    A.value = sa && D.P.some(function (p) { return p.slug === sa; }) ? sa : D.P[0].slug;
    B.value = sb && D.P.some(function (p) { return p.slug === sb; }) ? sb : D.P[1].slug;
    var pa = D.P.filter(function (p) { return p.slug === A.value; })[0], pb = D.P.filter(function (p) { return p.slug === B.value; })[0];
    var box = $("cmp"); box.innerHTML = "";
    var wrap = el("div", "tablewrap"), t = el("table");
    t.innerHTML = "<thead><tr><th></th><th></th><th></th></tr></thead>";
    t.querySelector("th:nth-child(2)").textContent = pa.n; t.querySelector("th:nth-child(3)").textContent = pb.n;
    var tb = el("tbody");
    function line(l, x, y) { var tr = el("tr"); tr.appendChild(el("td", null, l)); tr.appendChild(el("td", null, x)); tr.appendChild(el("td", null, y)); tb.appendChild(tr); }
    function pos(p, k) { var v = p.c[k]; return (v > 0 ? "+" : "") + v + " " + side(v, k); }
    line("Familia", pa.f, pb.f);
    line("Evidencia", pa.ev === "A" ? "documento propio" : (pa.ev === "B" ? "estatuto" : "estimada"), pb.ev === "A" ? "documento propio" : (pb.ev === "B" ? "estatuto" : "estimada"));
    D.AX.forEach(function (ax, k) { line(ax.k, pos(pa, k), pos(pb, k)); });
    var vl = function (p, k) { var x = p.vv ? p.vv[k] : null; return x == null ? "sin dato" : (x === 1 ? "a favor" : (x === -1 ? "en contra" : "dividido")); };
    D.V.defs.forEach(function (v, k) { line(v.n, vl(pa, k), vl(pb, k)); });
    line("Datos al", fmtDate(pa.asof), fmtDate(pb.asof));
    t.appendChild(tb); wrap.appendChild(t); box.appendChild(wrap);
    var d = 0; for (var a = 0; a < 4; a++) d += Math.pow(pa.c[a] - pb.c[a], 2);
    box.appendChild(el("p", "small muted", "Cercanía entre ambos en los cuatro ejes: " + Math.round(Math.max(0, 1 - Math.sqrt(d) / 6) * 100) + "%. Las posiciones son estimaciones."));
    var l = el("p", "small");
    l.appendChild(Object.assign(el("a", null, "Ficha de " + pa.n), { href: "#partido/" + pa.slug })); l.appendChild(document.createTextNode(" · "));
    l.appendChild(Object.assign(el("a", null, "Ficha de " + pb.n), { href: "#partido/" + pb.slug })); box.appendChild(l);
    show("compare", "t-compare"); document.title = "Comparar partidos · Cuarto Oscuro";
  }

  // ---------- método ----------
  function renderMethod() {
    var box = $("mcard"); box.innerHTML = "";
    var h = el("h2", null, "Cómo se calcula"); h.id = "t-method"; h.tabIndex = -1; box.appendChild(h);
    [
      "Cada afirmación pertenece a uno de cuatro ejes y tiene un signo: estar de acuerdo empuja hacia un extremo del eje o hacia el otro. Las respuestas van de −2 (muy en desacuerdo) a +2 (muy de acuerdo).",
      "Tu posición en cada eje es el promedio ponderado de tus respuestas de ese eje, con signo. Una respuesta marcada como importante pesa el doble. Si no respondiste nada de un eje, queda en 0.",
      "Cada partido tiene una posición estimada en los mismos cuatro ejes, entre −2 y +2. La afinidad es 100% menos la distancia euclídea en 4 dimensiones dividida por 6, con piso en 0%.",
      "La evidencia de cada partido se marca así: A, la ubicación se apoya en un documento programático propio; B, solo en el estatuto o carta orgánica, que casi nunca habla de ideología; C, es una estimación a partir de declaraciones y votos. Una ubicación C es la más discutible.",
      "La coincidencia de votos relaciona algunas de tus respuestas con votaciones reales. Solo cuenta las votaciones donde tu postura es clara y el partido votó a favor o en contra de manera definida.",
      "Nada de esto es una verdad oficial ni una recomendación de voto. Si no estás de acuerdo con una ubicación o con un dato, podés reportarlo desde la ficha del partido: cada corrección necesita una fuente."
    ].forEach(function (t) { box.appendChild(el("p", null, t)); });
    box.appendChild(el("h3", null, "Posiciones estimadas de cada partido"));
    var wrap = el("div", "tablewrap"), t = el("table");
    t.innerHTML = "<thead><tr><th>Partido</th>" + D.AX.map(function (a) { return "<th class='n'>" + a.k + "</th>"; }).join("") + "<th>Ev.</th><th>Datos al</th></tr></thead>";
    var tb = el("tbody");
    D.P.forEach(function (p) {
      var tr = el("tr"), c = el("td"); c.appendChild(Object.assign(el("a", null, p.n), { href: "#partido/" + p.slug })); tr.appendChild(c);
      p.c.forEach(function (v) { tr.appendChild(el("td", "n", (v > 0 ? "+" : "") + v)); });
      tr.appendChild(el("td", null, p.ev)); tr.appendChild(el("td", null, fmtDate(p.asof))); tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); box.appendChild(wrap);
    var l = el("p", "small"); l.appendChild(link("Ver los datos y el código en GitHub", REPO)); box.appendChild(l);
    show("method", "t-method"); document.title = "Método · Cuarto Oscuro";
  }


  // ---------- provincias ----------
  function renderDistricts(slug) {
    var sel = $("dsel");
    if (!D.DIST) { $("dist-note").textContent = "No pude cargar los datos de provincias."; show("districts", "t-dist"); return; }
    $("dist-note").textContent = D.DIST.nota;
    if (!sel.options.length) {
      D.DIST.distritos.forEach(function (d) { var o = el("option", null, d.n); o.value = d.slug; sel.appendChild(o); });
      sel.addEventListener("change", function () { location.hash = "#distritos/" + sel.value; });
    }
    var d = D.DIST.distritos.filter(function (x) { return x.slug === slug; })[0] || D.DIST.distritos[0];
    sel.value = d.slug;
    var box = $("ddetail"); box.innerHTML = "";
    box.style.cssText = "display:flex;flex-direction:column;gap:12px;margin-top:12px";
    box.appendChild(el("h3", null, d.n + ": " + d.gobierno));
    box.appendChild(el("p", null, d.fuerzas));
    box.appendChild(el("h3", null, "Fuerzas mencionadas"));
    var ul = el("ul", "small notes");
    d.partidos.forEach(function (p) {
      var li = el("li"); li.appendChild(el("b", null, p.n + ". ")); li.appendChild(document.createTextNode(p.nt + " "));
      if (p.nacional) {
        var np = D.P.filter(function (x) { return x.slug === p.nacional; })[0];
        if (np) { li.appendChild(document.createTextNode("Partido nacional vinculado: ")); li.appendChild(Object.assign(el("a", null, np.n), { href: "#partido/" + np.slug })); li.appendChild(document.createTextNode(". ")); }
      }
      (p.src || []).forEach(function (x, k) { if (k) li.appendChild(document.createTextNode(" · ")); li.appendChild(link(x[0], x[1])); });
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (d.municipios && d.municipios.length) {
      box.appendChild(el("h3", null, "Municipios cargados"));
      var u2 = el("ul", "small notes");
      d.municipios.forEach(function (m) {
        var li = el("li"); li.appendChild(el("b", null, m.n + ": ")); li.appendChild(document.createTextNode(m.jefe + ". " + m.nt + " "));
        m.src.forEach(function (x) { li.appendChild(link(x[0], x[1])); }); u2.appendChild(li);
      });
      box.appendChild(u2);
    }
    box.appendChild(el("h3", null, "Fuentes"));
    var l = el("div", "lk"); l.style.cssText = "display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.88rem";
    d.src.forEach(function (x) { l.appendChild(link(x[0], x[1])); }); box.appendChild(l);
    var f = el("p", "small muted", "Datos al " + fmtDate(d.asof) + ". "); f.appendChild(reportLink("Distrito " + d.n)); box.appendChild(f);
    show("districts", "t-dist"); document.title = d.n + " · Cuarto Oscuro";
  }

  // ---------- compartir ----------
  // En el sitio publicado se comparte /r/…: esa página tiene su propia imagen para redes
  // (api/r.mjs) y lleva al resultado. En local no existe, así que se usa el #r/… de siempre.
  function shareUrl() {
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
    return local ? location.origin + location.pathname + S.hash : location.origin + "/" + S.hash.slice(1);
  }
  function copyLink() {
    var u = shareUrl(), b = $("copy");
    function done(msg) { b.textContent = msg; say(msg); setTimeout(function () { b.textContent = "Copiar enlace"; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(u).then(function () { done("Enlace copiado"); }, function () { fallbackCopy(u, done); });
    } else fallbackCopy(u, done);
  }
  function fallbackCopy(u, done) {
    var t = document.createElement("textarea"); t.value = u; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(t); t.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(t);
    done(ok ? "Enlace copiado" : "Copialo a mano: " + u);
  }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function downloadCard() {
    var W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var c = cv.getContext("2d"), bg = cssVar("--paper") || "#fff", ink = cssVar("--ink") || "#14213d", mu = cssVar("--muted") || "#5b6678",
      soft = cssVar("--soft") || "#e3e9f6", mark = cssVar("--mark") || "#d9820b", acc = cssVar("--accent") || "#1f4fd8";
    var fd = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif', fm = '"IBM Plex Mono", ui-monospace, monospace';
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = mu; c.font = "28px " + fm; c.fillText("ARGENTINA · PARTIDOS POLÍTICOS", 70, 100);
    c.fillStyle = ink; c.font = "bold 84px " + fd; c.fillText("Cuarto Oscuro", 70, 190);
    S.me.forEach(function (v, a) {
      var y = 300 + a * 150;
      c.fillStyle = mu; c.font = "28px " + fd; c.fillText(D.AX[a].lo, 70, y); c.textAlign = "right"; c.fillText(D.AX[a].hi, W - 70, y); c.textAlign = "left";
      c.fillStyle = ink; c.font = "bold 30px " + fd; c.textAlign = "center"; c.fillText(D.AX[a].k, W / 2, y); c.textAlign = "left";
      c.fillStyle = soft; c.fillRect(70, y + 25, W - 140, 16);
      c.fillStyle = mu; c.fillRect(W / 2 - 2, y + 15, 4, 36);
      var x = 70 + (v + 2) / 4 * (W - 140);
      c.fillStyle = mark; c.beginPath(); c.arc(x, y + 33, 20, 0, 7); c.fill();
    });
    c.fillStyle = ink; c.font = "bold 44px " + fd; c.fillText("Partidos más cercanos", 70, 960);
    S.ranked.slice(0, 3).forEach(function (r, k) {
      var y = 1030 + k * 90;
      c.fillStyle = ink; c.font = "bold 40px " + fd; c.fillText(r.p.n, 70, y);
      c.fillStyle = acc; c.font = "40px " + fm; c.textAlign = "right"; c.fillText(r.pct + "%", W - 70, y); c.textAlign = "left";
    });
    c.fillStyle = mu; c.font = "26px " + fd;
    c.fillText("Mide cercanía de ideas. No es una recomendación de voto.", 70, 1300);
    cv.toBlob(function (blob) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cuarto-oscuro.png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      say("Tarjeta descargada");
    }, "image/png");
  }

  // ---------- rutas ----------
  function route() {
    var h = location.hash;
    document.title = "Cuarto Oscuro · Test de ideología política argentina";
    if (/^#r\//.test(h)) {
      if (decodeHash(h)) {
        S.hash = h; renderResult(); show("result", "headline");
      } else { location.hash = ""; }
    } else if (/^#partido\//.test(h)) {
      renderParty(decodeURIComponent(h.slice(9)));
    } else if (h === "#linea") {
      renderTimeline();
    } else if (h === "#metodo") {
      renderMethod();
    } else if (/^#comparar/.test(h)) {
      var pp = h.split("/"); renderCompare(pp[1], pp[2]);
    } else if (/^#distritos/.test(h)) {
      renderDistricts(h.split("/")[1]);
    } else if (/^#(main|)$/.test(h)) {
      show("intro");
    } else { show("intro"); }
  }
})();
