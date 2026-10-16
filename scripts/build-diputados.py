#!/usr/bin/env python3
"""Genera data/diputados.json (votos de Diputados por bloque) a partir de una recopilación abierta
de las actas oficiales de votaciones.hcdn.gob.ar (información pública).

Uso: python3 scripts/build-diputados.py [ruta/a/diputados.json]
Sin argumento, descarga el archivo crudo desde GitHub.
Códigos de voto de la fuente: 1 afirmativo, 2 negativo, 3 abstención, 4 ausente, 5 presidente.
Ojo: los campos a/n/b/u de la fuente están mal rotulados, por eso se recuentan desde los votos individuales.
"""
import json, sys, collections, urllib.request, os

RAW = "https://raw.githubusercontent.com/rquiroga7/como_voto/main/data/diputados.json"
# clave de acta -> (id de votación en HCDN, título corto)
ACTAS = {
    "d-bases": ("5272", "Ley Bases: aceptación de los cambios del Senado"),
    "d-presupuesto": ("5822", "Presupuesto 2026, en general"),
    "d-labor": ("5853", "Modernización laboral, en general"),
    "d-rpj": ("5847", "Régimen Penal Juvenil, en general"),
    "d-dnu": ("5774", "Reforma de la ley de DNU (26.122), en general"),
    "d-glaciares": ("5902", "Ley de Glaciares, en general y particular"),
    "d-discapacidad": ("5667", "Emergencia en discapacidad, en general"),
}
MAJ = {"d-bases": "mayoría simple"}  # el resto: mayoría simple de los presentes

def load():
    if len(sys.argv) > 1:
        return json.load(open(sys.argv[1], encoding="utf8"))
    with urllib.request.urlopen(RAW, timeout=120) as r:
        return json.load(r)

def title(s):
    return " ".join(w.capitalize() if w.isupper() and len(w) > 3 else w for w in s.split())

def main():
    d = load()
    V = {x["id"]: x for x in d["votaciones"]}
    out = {
        "fuente": "Votaciones nominales oficiales de la Cámara de Diputados (votaciones.hcdn.gob.ar)",
        "url_fuente": "https://votaciones.hcdn.gob.ar/",
        "nota": "Votos nominales de la Cámara de Diputados agrupados por el bloque en que cada diputado figuraba en el acta. Un bloque no es un partido. No se cuenta al presidente de la Cámara.",
        "actas": {},
    }
    for key, (vid, t) in ACTAS.items():
        v = V[vid]
        blocs = collections.defaultdict(lambda: [0, 0, 0, 0])
        for _, b, _, c in v["v"]:
            if c == 5:
                continue
            blocs[d["blocs"][b].strip() or "Sin bloque"][{1: 0, 2: 1, 3: 2}.get(c, 3)] += 1
        rows = sorted(([k] + x for k, x in blocs.items()), key=lambda r: (-sum(r[1:3]), r[0]))
        tot = [sum(r[i] for r in rows) for i in (1, 2, 3, 4)]
        out["actas"][key] = {
            "t": t, "d": "-".join(reversed(v["d"][:10].split("/"))), "id": vid,
            "u": f"https://votaciones.hcdn.gob.ar/votacion/{vid}",
            "tot": tot, "b": rows,
        }
    path = os.path.join(os.path.dirname(__file__), "..", "data", "diputados.json")
    json.dump(out, open(path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    for k, a in out["actas"].items():
        print(k, a["d"], a["tot"], len(a["b"]), "bloques")

if __name__ == "__main__":
    main()
