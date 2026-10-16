#!/usr/bin/env python3
"""Genera data/historicas.json: votos nominales por bloque de leyes emblemáticas (Diputados y Senado),
a partir de los datos abiertos de ¿Cómo votó? (https://comovoto.dev.ar, repo rquiroga7/como_voto, MIT).
Uso: python3 scripts/build-historicas.py [dir con diputados.json y senadores.json]
Códigos de voto: 1 afirmativo, 2 negativo, 3 abstención, 4 ausente, 5 presidente (no se cuenta).
Los títulos son los del acta; no se agrega contexto que no esté en la fuente."""
import json, sys, os, collections, urllib.request

RAW = "https://raw.githubusercontent.com/rquiroga7/como_voto/main/data/"
# (clave, tema, nombre, [(cámara, id de votación)], nota opcional)
ITEMS = [
    ("movilidad-2008", "Previsión", "Movilidad de las prestaciones previsionales (2008)", [("D", "2079"), ("S", "1391")], None),
    ("afjp-2008", "Previsión", "Sistema Integrado Previsional Argentino, fin de las AFJP (2008)", [("D", "2052"), ("S", "2001")], None),
    ("medios-2009", "Medios", "Servicios de Comunicación Audiovisual (2009)", [("D", "1992"), ("S", "1488")], None),
    ("matrimonio-2010", "Derechos", "Matrimonio: modificación del Código Civil (2010)", [("D", "1900")], "No tengo el acta del Senado de esta ley en la fuente."),
    ("identidad-2011", "Derechos", "Derecho a la Identidad de Género (2011)", [("D", "393")], "No tengo el acta del Senado de esta ley en la fuente."),
    ("ypf-2012", "Economía", "Expropiación del 51% de YPF (2012)", [("S", "765"), ("D", "365")], None),
    ("reparacion-2016", "Previsión", "Reparación Histórica para jubilados y sinceramiento fiscal (2016)", [("D", "2155"), ("S", "23")], None),
    ("previsional-2017", "Previsión", "Reforma previsional (2017)", [("D", "3727")], "El Senado registró dos actas casi iguales de esta votación (ids 284 y 285 de la fuente) y no pude determinar cuál es la definitiva, por eso no la incluyo."),
    ("ive-2018", "Derechos", "Interrupción voluntaria del embarazo (2018)", [("D", "3805"), ("S", "361")], "El Senado la rechazó."),
    ("etiquetado-2020", "Salud", "Etiquetado frontal de alimentos (2020)", [("S", "1233")], "No encontré el acta de Diputados bajo ese título."),
    ("ive-2020", "Derechos", "Regulación del acceso a la interrupción voluntaria del embarazo (2020)", [("D", "4077"), ("S", "1260")], None),
    ("fmi-2022", "Economía", "Programa de Facilidades Extendidas con el FMI (2022)", [("D", "4331"), ("S", "1358")], None),
    ("universitario-2025", "Educación", "Financiamiento universitario (2025), incluida la insistencia tras el veto", [("D", "5702"), ("S", "2571"), ("D", "5766"), ("S", "2598")], None),
]

def load(base, name):
    if base:
        return json.load(open(os.path.join(base, name), encoding="utf8"))
    with urllib.request.urlopen(RAW + name, timeout=180) as r:
        return json.load(r)

def acta(data, cam, vid):
    v = {x["id"]: x for x in data["votaciones"]}[vid]
    bl = collections.defaultdict(lambda: [0, 0, 0, 0])
    for _, b, _, c in v["v"]:
        if c == 5:
            continue
        bl[data["blocs"][b].strip() or "Sin bloque"][{1: 0, 2: 1, 3: 2}.get(c, 3)] += 1
    rows = sorted(([k] + x for k, x in bl.items()), key=lambda r: (-sum(r[1:4]), r[0]))
    tot = [sum(r[i] for r in rows) for i in (1, 2, 3, 4)]
    if len(rows) > 12:
        rest = rows[12:]
        rows = rows[:12] + [[f"Otros ({len(rest)} bloques)"] + [sum(r[i] for r in rest) for i in (1, 2, 3, 4)]]
    u = (f"https://votaciones.hcdn.gob.ar/votacion/{vid}" if cam == "D" else f"https://www.senado.gob.ar/votaciones/detalleActa/{vid}")
    t = " ".join(v["t"].split())
    return {"cam": cam, "id": vid, "t": t[:140], "d": "-".join(reversed(v["d"].split()[0].split("/"))), "u": u, "tot": tot, "b": rows}

def main():
    base = sys.argv[1] if len(sys.argv) > 1 else None
    D, S = load(base, "diputados.json"), load(base, "senadores.json")
    out = {
        "fuente": "¿Cómo votó? (rquiroga7/como_voto, MIT) sobre votaciones.hcdn.gob.ar y senado.gob.ar",
        "nota": "Votos nominales agrupados por el bloque en que cada legislador figuraba en el acta (se muestran los 12 bloques más grandes). Un bloque no es un partido. No se cuenta al presidente de la cámara. Los títulos son los del acta.",
        "items": [],
    }
    for key, tema, n, ids, nota in ITEMS:
        it = {"key": key, "tema": tema, "n": n, "actas": [acta(D if c == "D" else S, c, i) for c, i in ids]}
        if nota:
            it["nota"] = nota
        out["items"].append(it)
    path = os.path.join(os.path.dirname(__file__), "..", "data", "historicas.json")
    json.dump(out, open(path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    for it in out["items"]:
        print(it["key"], [(a["cam"], a["d"], a["tot"]) for a in it["actas"]])

if __name__ == "__main__":
    main()
