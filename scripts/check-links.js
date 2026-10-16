// Revisa que los enlaces de fuentes respondan. Uso: node scripts/check-links.js
// Los sitios gubernamentales a veces bloquean bots, así que los 403/429 se informan como "dudosos", no como rotos.
const fs = require("fs"), path = require("path");
const urls = new Map();
const add = (u, w) => { if (u && /^https?:/.test(u)) { if (!urls.has(u)) urls.set(u, []); urls.get(u).push(w); } };
const walk = (o, w) => {
  if (Array.isArray(o)) { if (o.length === 2 && typeof o[1] === "string" && /^https?:/.test(o[1])) add(o[1], w); else o.forEach((x) => walk(x, w)); }
  else if (o && typeof o === "object") for (const k in o) { if (k === "u" && typeof o[k] === "string") add(o[k], w); walk(o[k], w); }
};
for (const f of fs.readdirSync(path.join(__dirname, "..", "data"))) walk(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", f), "utf8")), f);
(async () => {
  const broken = [], doubtful = [];
  const list = [...urls.keys()];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const u = list[i++];
      try {
        let r = await fetch(u, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "cuarto-oscuro-linkcheck" } });
        if (r.status === 405 || r.status === 403) r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "cuarto-oscuro-linkcheck" } });
        if (r.status === 404 || r.status === 410) broken.push(`${r.status} ${u} (${urls.get(u)[0]})`);
        else if (r.status >= 400) doubtful.push(`${r.status} ${u}`);
      } catch (e) { doubtful.push(`ERR ${u} ${e.message}`); }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`${list.length} enlaces revisados`);
  if (doubtful.length) console.log("Dudosos (posible bloqueo a bots):\n" + doubtful.join("\n"));
  if (broken.length) { console.error("Rotos:\n" + broken.join("\n")); process.exit(1); }
  console.log("sin enlaces rotos (404/410)");
})();
