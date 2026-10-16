// Busca actas nuevas del Senado después de la última cargada y lista sus títulos.
// Uso: node scripts/watch-actas.js  (sale con código 0 y escribe un resumen; el workflow abre un issue si hay novedades)
const fs = require("fs"), path = require("path");
const V = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "votes.json"), "utf8"));
const known = Object.values(V.actas).map((a) => Number((a.u.match(/(\d+)\/?$/) || [])[1])).filter(Boolean);
const last = Math.max(...known);
const base = "https://www.senado.gob.ar/votaciones/detalleActa/";
(async () => {
  const found = [];
  let misses = 0;
  for (let id = last + 1; id < last + 400 && misses < 25; id++) {
    try {
      const r = await fetch(base + id, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "cuarto-oscuro-watch" } });
      if (!r.ok) { misses++; continue; }
      const html = await r.text();
      const t = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
      const h = (html.match(/(\d{2}\/\d{2}\/\d{4})/) || [])[1] || "";
      if (html.length < 2000) { misses++; continue; }
      misses = 0; found.push(`${id} ${h} ${t.trim().replace(/\s+/g, " ")}`);
    } catch (e) { misses++; }
  }
  console.log(`Última acta cargada: ${last}. Nuevas encontradas: ${found.length}`);
  found.forEach((x) => console.log(base + x));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${found.length}\n`);
})();
