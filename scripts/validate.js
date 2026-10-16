// Valida la estructura de data/*.json. Uso: node scripts/validate.js
const fs = require("fs"), path = require("path");
const rd = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", f), "utf8"));
const errs = [];
const err = (m) => errs.push(m);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const isUrl = (u) => /^https?:\/\/[^\s]+$/.test(u);
const links = (arr, where) => (arr || []).forEach((x, i) => {
  if (!Array.isArray(x) || x.length !== 2 || !x[0] || !isUrl(x[1])) err(`${where}[${i}]: enlace inválido`);
});

const Q = rd("questions.json"), P = rd("parties.json"), V = rd("votes.json"), T = rd("timeline.json"), M = rd("meta.json");
let HI = null; try { HI = rd("historicas.json"); } catch (e) { /* opcional */ }
let DP = null; try { DP = rd("diputados.json"); } catch (e) { /* opcional */ }
let D = null; try { D = rd("distritos.json"); } catch (e) { /* opcional */ }

if (!isDate(M.updated)) err("meta.updated inválida");
if (Q.axes.length !== 4) err("deben ser 4 ejes");
const ids = new Set();
Q.questions.forEach((q) => {
  if (ids.has(q.id)) err(`pregunta ${q.id} duplicada`); ids.add(q.id);
  if (!q.t || ![0, 1, 2, 3].includes(q.a) || ![1, -1].includes(q.s)) err(`pregunta ${q.id}: campos inválidos`);
});
if (Q.questions.filter((q) => q.core).length < 10) err("versión corta con menos de 10 preguntas");

const slugs = new Set();
P.forEach((p) => {
  const w = `partido ${p.slug || p.n}`;
  if (!p.slug || slugs.has(p.slug)) err(`${w}: slug faltante o repetido`); slugs.add(p.slug);
  if (!Array.isArray(p.c) || p.c.length !== 4 || p.c.some((x) => typeof x !== "number" || x < -2 || x > 2)) err(`${w}: c inválido`);
  if (!["A", "B", "C"].includes(p.ev)) err(`${w}: ev inválido`);
  if (!isDate(p.asof)) err(`${w}: asof inválida`);
  if (p.vv && p.vv.length !== V.defs.length) err(`${w}: vv debe tener ${V.defs.length} entradas`);
  if (p.vv && p.vv.some((x) => ![1, -1, 0, null].includes(x))) err(`${w}: vv con valores inválidos`);
  if (p.cp && (!p.lk || !p.lk.length)) err(`${w}: campañas sin enlaces`);
  if (p.pj && (!p.pl || !p.pl.length)) err(`${w}: proyectos sin enlaces`);
  links(p.lk, w + ".lk"); links(p.pl, w + ".pl");
});

V.defs.forEach((v, k) => {
  if (v.id !== k) err(`votación ${v.n}: id debe ser ${k}`);
  if (!isDate(v.date)) err(`votación ${v.n}: fecha inválida`);
  v.q.forEach((x) => { if (!ids.has(x[0])) err(`votación ${v.n}: pregunta ${x[0]} inexistente`); });
  (v.actasD || []).forEach((k) => { if (!DP || !DP.actas[k]) err(`votación ${v.n}: acta de Diputados ${k} inexistente`); });
  if (v.acta && !V.actas[v.acta]) err(`votación ${v.n}: acta ${v.acta} inexistente`);
  links(v.links, `votación ${v.n}.links`);
});
Object.entries(V.actas).forEach(([k, a]) => {
  if (!isUrl(a.u)) err(`acta ${k}: url inválida`);
  const t = a.b.reduce((s, r) => s.map((x, i) => x + r[i + 1]), [0, 0, 0, 0]);
  if (t.some((x, i) => x !== a.tot[i])) err(`acta ${k}: los bloques suman ${t} y el total dice ${a.tot}`);
});

if (DP) Object.entries(DP.actas).forEach(([k, a]) => {
  const t = a.b.reduce((s, r) => s.map((x, i) => x + r[i + 1]), [0, 0, 0, 0]);
  if (t.some((x, i) => x !== a.tot[i])) err(`acta ${k}: los bloques suman ${t} y el total dice ${a.tot}`);
  if (!isUrl(a.u)) err(`acta ${k}: url inválida`);
});

if (HI) HI.items.forEach((it) => {
  if (!it.key || !it.n || !it.actas.length) err(`histórica ${it.key}: incompleta`);
  it.actas.forEach((a) => {
    const t = a.b.reduce((s, r) => s.map((x, i) => x + r[i + 1]), [0, 0, 0, 0]);
    if (t.some((x, i) => x !== a.tot[i])) err(`histórica ${it.key} ${a.cam}${a.id}: los bloques suman ${t} y el total dice ${a.tot}`);
    if (!isUrl(a.u) || !isDate(a.d)) err(`histórica ${it.key} ${a.id}: url o fecha inválida`);
  });
});

T.items.forEach((i, k) => {
  if (!isDate(i.d)) err(`timeline[${k}]: fecha inválida`);
  if (k && T.items[k - 1].d > i.d) err(`timeline[${k}]: fuera de orden`);
  if (!i.src || !i.src.length) err(`timeline[${k}]: sin fuente`);
  links(i.src, `timeline[${k}].src`);
});

if (D) {
  const seen = new Set();
  D.distritos.forEach((d) => {
    const w = `distrito ${d.slug || d.n}`;
    if (!d.slug || seen.has(d.slug)) err(`${w}: slug faltante o repetido`); seen.add(d.slug);
    if (!isDate(d.asof)) err(`${w}: asof inválida`);
    if (!d.gobierno || !d.fuerzas) err(`${w}: faltan gobierno o fuerzas`);
    links(d.src, w + ".src");
    if (!d.src || !d.src.length) err(`${w}: sin fuentes`);
    (d.partidos || []).forEach((x, j) => {
      if (!x.n || !x.nt) err(`${w}.partidos[${j}]: incompleto`);
      if (x.nacional && !slugs.has(x.nacional)) err(`${w}.partidos[${j}]: slug nacional ${x.nacional} inexistente`);
      links(x.src, `${w}.partidos[${j}].src`);
    });
  });
}
if (errs.length) { console.error(errs.join("\n")); console.error(`\n${errs.length} error(es)`); process.exit(1); }
console.log("datos OK");
