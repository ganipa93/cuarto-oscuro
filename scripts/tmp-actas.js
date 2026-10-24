// TEMPORAL: baja actas del Senado y resume cabecera y votos por bloque.
const fs = require("fs");
const rangos = [[2679, 2696], [2763, 2771], [2789, 2847]];
const ids = []; rangos.forEach(([a, b]) => { for (let i = a; i <= b; i++) ids.push(i); });
const ent = { aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", nbsp: " ", quot: '"', amp: "&", ordm: "º", deg: "°" };
const lineas = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<\/(tr|td|th|p|div|h\d|li|span)>/gi, "\n")
  .replace(/<[^>]+>/g, " ").replace(/&(\w+);/g, (m, e) => ent[e] || " ").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n))
  .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
const VOTOS = ["AFIRMATIVO", "NEGATIVO", "ABSTENCIÓN", "AUSENTE"];
(async () => {
  const out = {};
  for (const id of ids) {
    try {
      const r = await fetch("https://www.senado.gob.ar/votaciones/detalleActa/" + id, { headers: { "user-agent": "cuarto-oscuro" }, signal: AbortSignal.timeout(30000) });
      const L = lineas(await r.text());
      const i0 = L.findIndex((l) => /^Acta Nro/i.test(l)), i1 = L.findIndex((l) => /^Datos abiertos/i.test(l));
      if (i0 < 0 || i1 < 0) { out[id] = { error: "sin cabecera" }; continue; }
      const head = L.slice(i0, i1);
      const num = (k) => { const j = head.indexOf(k); return j > 0 ? Number(head[j - 1]) : null; };
      const b = {}, sen = [];
      for (let k = i1; k < L.length - 3; k++) {
        const v = L[k + 3].replace("ABSTENCION", "ABSTENCIÓN");
        if (VOTOS.includes(v) && !/^(Foto|Senador|Bloque|Provincia|th )/.test(L[k])) {
          const bl = L[k + 1]; b[bl] = b[bl] || [0, 0, 0, 0]; b[bl][VOTOS.indexOf(v)]++; sen.push([L[k], bl, L[k + 2], v[0]]); k += 3;
        }
      }
      out[id] = { head, tot: [num("AFIRMATIVOS"), num("NEGATIVOS"), num("ABSTENCIONES"), num("AUSENTES")], b, n: sen.length };
    } catch (e) { out[id] = { error: String(e) }; }
  }
  fs.mkdirSync("tmp", { recursive: true });
  fs.writeFileSync("tmp/actas-senado-2026.json", JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length, "actas");
})();
