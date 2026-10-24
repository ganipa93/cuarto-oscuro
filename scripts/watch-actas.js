// Busca actas nuevas del Senado posteriores a la última cargada y lista su fecha y título.
// Uso: node scripts/watch-actas.js  (sale con código 0 y escribe un resumen; el workflow abre un issue si hay novedades)
//
// Cuidados, porque la numeración del Senado no es cronológica:
//  - se cargan actas históricas con números nuevos (2005, 2009, 2013…): se descartan las que tienen
//    fecha anterior a la última acta cargada;
//  - pasado el último número existente, el sitio devuelve una página sin votación que muestra la fecha
//    del día: solo cuenta como acta una página con resultados (afirmativos y negativos).
const fs = require("fs"), path = require("path");
const V = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "votes.json"), "utf8"));
const senado = Object.values(V.actas).filter((a) => /senado\.gob\.ar/.test(a.u));
const last = Math.max(...senado.map((a) => Number((a.u.match(/(\d+)\/?$/) || [])[1])).filter(Boolean));
const lastDate = senado.map((a) => a.d).sort().pop();
const base = "https://www.senado.gob.ar/votaciones/detalleActa/";
const hoy = new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" });

const texto = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó")
  .replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const iso = (dmy) => dmy.split("/").reverse().join("-");

// Fecha de la votación: la que sigue a "Fecha", o si no, la primera que no sea la de hoy
function fecha(t) {
  const m = t.match(/Fecha[^0-9]{0,40}(\d{2}\/\d{2}\/\d{4})/i);
  if (m) return m[1];
  return (t.match(/\d{2}\/\d{2}\/\d{4}/g) || []).find((d) => d !== hoy) || "";
}
// Asunto: el texto después de "Acta" / "Título" / "Expediente", acotado
function asunto(t) {
  const m = t.match(/(?:T[ií]tulo|Asunto|Descripci[oó]n)\s*:?\s*(.{10,220}?)(?:\s+(?:Fecha|Tipo|Resultado|Afirmativ|Qu[oó]rum)\b|$)/i);
  return m ? m[1].trim() : "";
}

(async () => {
  const found = [];
  let misses = 0, viejas = 0;
  for (let id = last + 1; id < last + 600 && misses < 25; id++) {
    try {
      const r = await fetch(base + id, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "cuarto-oscuro-watch" } });
      if (!r.ok) { misses++; continue; }
      const t = texto(await r.text());
      if (!/afirmativ/i.test(t) || !/negativ/i.test(t)) { misses++; continue; }
      misses = 0;
      const f = fecha(t);
      if (!f || iso(f) <= lastDate) { viejas++; continue; }
      found.push({ id, f, a: asunto(t) });
    } catch (e) { misses++; }
  }
  console.log(`Última acta cargada: ${last} (${lastDate}). Actas nuevas: ${found.length}. Descartadas por ser anteriores: ${viejas}.`);
  // agrupadas por sesión, que es como se revisan
  const porFecha = {};
  found.forEach((x) => (porFecha[x.f] = porFecha[x.f] || []).push(x));
  Object.entries(porFecha).sort((a, b) => iso(a[0]).localeCompare(iso(b[0]))).forEach(([f, xs]) => {
    console.log(`\nSesión del ${f} (${xs.length} actas):`);
    xs.forEach((x) => console.log(`- ${base}${x.id}${x.a ? " · " + x.a : ""}`));
  });
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${found.length}\n`);
})();
