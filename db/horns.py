#!/usr/bin/env python3
"""
Agrupa hunting-horns por sus 3 notas base (campo `weapon.notes`) usando MHWorldData (SQLite).
Cambia DB_PATH a la ruta de tu fichero .sql/.sqlite
"""

import sqlite3
import json
import csv
from pathlib import Path
from collections import Counter, defaultdict
from typing import List, Dict, Tuple

DB_PATH = Path(__file__).resolve().parent / "mhw.db"

# Mapeo sugerido letra -> color/nombre (ajusta si en tu dataset difiere)
LETTER_TO_COLOR = {
    "P": "Purple",
    "R": "Red",
    "G": "Green",
    "Y": "Yellow",
    "O": "Orange",
    "C": "Cyan",
    "B": "Blue",
    "W": "White",
    "E": "Echo",   # usado en weapon_melody_notes por ejemplos como "ER"/"EO"
    # añade más si aparecen otras letras
}

def normalize_notes(s: str) -> str:
    """Normaliza el campo notes (quita espacios, mayúsculas)."""
    if s is None:
        return ""
    return "".join(s.split()).upper()

def fetch_horns(conn: sqlite3.Connection, lang: str = "en") -> List[Dict]:
    cur = conn.cursor()
    q = """
    SELECT w.id, wt.name, w.notes, w.rarity, w.attack
    FROM weapon w
    JOIN weapon_text wt ON w.id = wt.id AND wt.lang_id = ?
    WHERE w.weapon_type = 'hunting-horn'
    ORDER BY w.id;
    """
    cur.execute(q, (lang,))
    rows = cur.fetchall()
    result = []
    for wid, name, notes_raw, rarity, attack in rows:
        notes = normalize_notes(notes_raw)
        result.append({
            "id": wid,
            "name_en": name,
            "notes_raw": notes_raw,
            "notes": notes,        # e.g. "PRG"
            "rarity": rarity,
            "attack": attack
        })
    return result

def group_by_notes(horns: List[Dict]) -> Dict[str, List[Dict]]:
    """Agrupa gaitas por su string de notas (orden tal cual)."""
    g = defaultdict(list)
    for h in horns:
        key = h["notes"] or "UNKNOWN"
        g[key].append(h)
    return dict(g)

def distinct_notes_values(horns: List[Dict]) -> List[str]:
    """Devuelve lista ordenada de valores distintos de weapon.notes."""
    vals = sorted({h["notes"] for h in horns if h["notes"]})
    return vals

def find_by_exact_notes(horns: List[Dict], notes_pattern: str) -> List[Dict]:
    """Buscar gaitas cuya cadena notes exactamente coincida con notes_pattern (orden y letras)."""
    pat = normalize_notes(notes_pattern)
    return [h for h in horns if h["notes"] == pat]

def find_by_notes_multiset(horns: List[Dict], notes_seq: str) -> List[Dict]:
    """
    Buscar gaitas que contienen exactamente las mismas letras (y cantidades) independientemente del orden.
    Ej: notes_seq="PRG" encontrará "PRG","GRP","RPG", etc.
    """
    pat = normalize_notes(notes_seq)
    pat_cnt = Counter(pat)
    out = []
    for h in horns:
        if not h["notes"]:
            continue
        if Counter(h["notes"]) == pat_cnt:
            out.append(h)
    return out

def pretty_notes_to_colors(notes: str) -> List[str]:
    return [LETTER_TO_COLOR.get(ch, ch) for ch in notes]

def export_json(data, path="horns_by_notes.json"):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Exportado JSON ->", path)

def export_csv(horns: List[Dict], path="horns_list.csv"):
    with open(path, "w", newline='', encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name_en", "notes", "notes_colors", "rarity", "attack"])
        for h in horns:
            writer.writerow([h["id"], h["name_en"], h["notes"], ";".join(pretty_notes_to_colors(h["notes"])), h["rarity"], h["attack"]])
    print("Exportado CSV ->", path)

if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    try:
        horns = fetch_horns(conn, lang="en")
        print(f"Total hunting-horns: {len(horns)}")

        distinct = distinct_notes_values(horns)
        print("Valores distintos en weapon.notes:", distinct)

        grouped = group_by_notes(horns)
        # Mostrar resumen: cuántas gaitas por cada combinación
        print("\nResumen por combinación de notas:")
        for k in sorted(grouped.keys()):
            print(f"  {k or 'UNKNOWN'} : {len(grouped[k])} gaita(s)  -> ejemplos: {[h['name_en'] for h in grouped[k][:3]]}")

        # Ejemplo: búsqueda por multiconjunto (usuario selecciona P, R, G)
        sel = "PRG"
        found_multiset = find_by_notes_multiset(horns, sel)
        print(f"\nGaitas que contienen exactamente las notas {sel} (cualquier orden): {len(found_multiset)}")
        for h in found_multiset[:10]:
            print(f"  - {h['id']}: {h['name_en']}  notes={h['notes']} ({pretty_notes_to_colors(h['notes'])})")

        # exportar resultados completos
        export_json(horns, "horns_flat.json")
        export_csv(horns, "horns_flat.csv")

    finally:
        conn.close()
