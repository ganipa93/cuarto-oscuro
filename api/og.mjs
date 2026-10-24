// Imagen para redes (1200×630) de un resultado: /api/og?c=s/0123-…/0100…
import { ImageResponse } from "@vercel/og";
import { readFileSync } from "node:fs";
import { resultado } from "./_resultado.mjs";

const font = (f) => readFileSync(new URL("./_fonts/" + f, import.meta.url));
const FONTS = [
  { name: "Bricolage", data: font("bricolage-grotesque-latin-500-normal.woff"), weight: 500, style: "normal" },
  { name: "Bricolage", data: font("bricolage-grotesque-latin-700-normal.woff"), weight: 700, style: "normal" },
  { name: "Plex", data: font("ibm-plex-mono-latin-400-normal.woff"), weight: 400, style: "normal" },
];

const C = { bg: "#eef1f5", paper: "#ffffff", ink: "#14213d", muted: "#5b6678", soft: "#e3e9f6", mark: "#b45309", accent: "#1f4fd8" };

// h("div", {style}, ...hijos): árbol que entiende ImageResponse sin JSX
function h(type, style, ...children) {
  const kids = children.flat().filter((x) => x != null && x !== false);
  return { type, props: { style: { display: "flex", ...style }, children: kids.length === 1 ? kids[0] : kids } };
}

function eje(ax, v) {
  const pos = Math.min(100, Math.max(0, ((v + 2) / 4) * 100));
  return h("div", { flexDirection: "column", marginBottom: 22 },
    h("div", { justifyContent: "space-between", fontSize: 21, color: C.muted, marginBottom: 10 },
      h("span", {}, ax.lo),
      h("span", { color: C.ink, fontWeight: 700, fontSize: 23 }, ax.k),
      h("span", {}, ax.hi)),
    h("div", { position: "relative", height: 28, alignItems: "center" },
      h("div", { width: "100%", height: 12, borderRadius: 6, background: C.soft }),
      h("div", { position: "absolute", left: "50%", top: 0, width: 3, height: 28, marginLeft: -1, background: C.muted }),
      h("div", { position: "absolute", left: pos + "%", top: 1, width: 26, height: 26, marginLeft: -13, borderRadius: 13, background: C.mark })));
}

function imagen(r) {
  return h("div", { width: "100%", height: "100%", background: C.bg, padding: 36, fontFamily: "Bricolage" },
    h("div", { flex: 1, flexDirection: "column", background: C.paper, borderRadius: 24, padding: "40px 52px" },
      h("div", { justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 },
        h("div", { flexDirection: "column" },
          h("span", { fontFamily: "Plex", fontSize: 18, color: C.muted, letterSpacing: 1 }, "ARGENTINA · PARTIDOS POLÍTICOS"),
          h("span", { fontSize: 56, fontWeight: 700, color: C.ink, lineHeight: 1.05 }, "Cuarto Oscuro")),
        h("span", { fontFamily: "Plex", fontSize: 18, color: C.muted }, "cuarto-oscuro.vercel.app")),
      h("div", { flex: 1 },
        h("div", { flexDirection: "column", width: 600, marginRight: 56 }, r.axes.map((ax, a) => eje(ax, r.me[a]))),
        h("div", { flexDirection: "column", flex: 1, borderLeft: "2px solid " + C.soft, paddingLeft: 40 },
          h("span", { fontSize: 26, fontWeight: 700, color: C.ink, marginBottom: 18 }, "Partidos más cercanos"),
          r.top.map((p) => h("div", { justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 },
            h("span", { fontSize: 25, fontWeight: 500, color: C.ink, maxWidth: 300 }, p.n),
            h("span", { fontFamily: "Plex", fontSize: 26, color: C.accent, marginLeft: 12 }, p.pct + "%"))))),
      h("span", { fontSize: 18, color: C.muted, marginTop: 12 }, "Mide cercanía de ideas. No es una recomendación de voto. Hacé el test vos también.")));
}

export function GET(request) {
  const r = resultado(new URL(request.url).searchParams.get("c"));
  if (!r) return Response.redirect(new URL("/og.png", request.url), 302);
  return new ImageResponse(imagen(r), {
    width: 1200, height: 630, fonts: FONTS,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
