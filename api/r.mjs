// Página de un resultado compartido: /r/s/0123-…/0100… (vercel.json la reescribe a /api/r?c=…).
// Da título e imagen propios a WhatsApp, X, etc., y lleva a la persona al resultado en /#r/….
import { resultado, side } from "./_resultado.mjs";

const SITE = "https://cuarto-oscuro.vercel.app";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function GET(request) {
  const url = new URL(request.url);
  const r = resultado(url.searchParams.get("c"));
  if (!r) return Response.redirect(new URL("/", request.url), 302);

  const destino = "/#r/" + r.code;
  const img = SITE + "/api/og?c=" + encodeURIComponent(r.code);
  const titulo = "Mi resultado en Cuarto Oscuro: más cerca de " + r.top[0].n + " (" + r.top[0].pct + "%)";
  const desc = r.axes.map((ax, a) => ax.k + ": " + side(r.me[a], a)).join(" · ") + ". Hacé el test y mirá qué partido se parece más a lo que pensás.";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="robots" content="noindex">
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cuarto Oscuro">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(SITE + "/r/" + r.code)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc("Resultado en Cuarto Oscuro: " + desc)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
<script>location.replace(${JSON.stringify(destino)});</script>
</head>
<body><p><a href="${esc(destino)}">Ver el resultado en Cuarto Oscuro</a></p></body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
