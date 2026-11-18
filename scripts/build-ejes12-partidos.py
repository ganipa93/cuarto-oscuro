#!/usr/bin/env python3
"""Genera data/ejes12.json["p"]: posición de cada partido en los ejes de 12 con base explícita.
Solo se cargan ejes con respaldo en datos del repo:
  D = derivado de la ubicación estimada en los 4 ejes (parties.json c)
  V = voto nominal verificado (parties.json vv; +-1,5 si votó a favor/en contra, 0 si dividido)
Los demás ejes quedan sin dato: no se estiman a ojo."""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
P = json.load(open(os.path.join(root, "parties.json"), encoding="utf-8"))
E = json.load(open(os.path.join(root, "ejes12.json"), encoding="utf-8"))
names = [x["k"] for x in E["ejes"]]
ix = {k: names.index(k) for k in ("Libertades y seguridad", "Soberanía y comercio", "Gasto e impuestos", "Valores", "Trabajo", "Poder presidencial", "Ambiente y producción")}
DERIV = {"Libertades y seguridad": 3, "Soberanía y comercio": 2, "Gasto e impuestos": 0, "Valores": 1}
# (índice en vv, signo): vv +1 = a favor de la votación. Reforma laboral (2): a favor = flexibilización (+).
# Reforma de los DNU (4): a favor = limitar decretos = institucionalista (-). Glaciares (5): a favor = prioridad productiva (+).
VOTO = {"Trabajo": (2, 1), "Poder presidencial": (4, -1), "Ambiente y producción": (5, 1)}
out = {}
for p in P:
    d = {}
    for k, c in DERIV.items():
        d[str(ix[k])] = [round(p["c"][c], 1), "D"]
    vv = p.get("vv") or []
    for k, (i, sg) in VOTO.items():
        if i < len(vv) and vv[i] is not None:
            d[str(ix[k])] = [round(1.5 * sg * vv[i], 1) + 0.0 if vv[i] else 0, "V"]
    out[p["slug"]] = d
E["p"] = out
E["p_nota"] = "Posición de cada partido por eje: [valor de -2 a +2 hacia el polo derecho, base]. Base D: derivada de su ubicación estimada en los 4 ejes. Base V: según su voto nominal. Los ejes que no figuran no tienen datos relevados (scripts/build-ejes12-partidos.py)."
json.dump(E, open(os.path.join(root, "ejes12.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(os.path.join(root, "ejes12.json"), "a").write("\n")
print({k: len(v) for k, v in out.items()})
