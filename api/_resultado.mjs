// Cálculo del resultado del lado del servidor, para la imagen y la página /r/.
// Repite score() y rank() de js/app.js: si cambia la fórmula allá, hay que cambiarla acá.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Q = require("../data/questions.json");
const P = require("../data/parties.json");

const RE = /^([sf])\/([0-4-]+)\/([01]+)$/;

// "s/0123-…/0100…" → { mode, ans, wt } o null si el código no es válido
export function parse(code) {
  const m = RE.exec(code || "");
  if (!m || m[2].length > Q.questions.length || m[3].length !== m[2].length) return null;
  let a = m[2], w = m[3];
  // enlaces viejos (con menos preguntas): las preguntas nuevas van al final
  while (a.length < Q.questions.length) { a += "-"; w += "0"; }
  const o = { mode: m[1] === "s" ? "short" : "full", ans: {}, wt: {} };
  Q.questions.forEach((q, k) => {
    const c = a.charAt(k);
    if (c !== "-") o.ans[q.id] = Number(c) - 2;
    if (w.charAt(k) === "1") o.wt[q.id] = true;
  });
  return o;
}

function score(ans, wt) {
  const sum = [0, 0, 0, 0], den = [0, 0, 0, 0];
  Q.questions.forEach((q) => {
    if (ans[q.id] == null) return;
    const w = wt[q.id] ? 2 : 1;
    sum[q.a] += w * q.s * ans[q.id]; den[q.a] += w;
  });
  return sum.map((s, a) => (den[a] ? s / den[a] : 0));
}

function rank(me) {
  return P.map((p) => {
    let d = 0;
    for (let a = 0; a < 4; a++) d += Math.pow(p.c[a] - me[a], 2);
    return { n: p.n, pct: Math.round(Math.max(0, 1 - Math.sqrt(d) / 6) * 100) };
  }).sort((x, y) => y.pct - x.pct);
}

export function side(v, a) {
  const m = Math.abs(v);
  if (m < 0.35) return "equilibrado";
  const name = v < 0 ? Q.axes[a].lo : Q.axes[a].hi;
  return (m > 1.2 ? "marcadamente " : "") + name.toLowerCase();
}

// Resultado completo para un código, o null
export function resultado(code) {
  const o = parse(code);
  if (!o || !Object.keys(o.ans).length) return null;
  const me = score(o.ans, o.wt);
  return { code, mode: o.mode, me, axes: Q.axes, top: rank(me).slice(0, 3) };
}
