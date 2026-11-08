#!/usr/bin/env python3
"""
Genera songs_in_horns.json automáticamente a partir de mhw.db.
Cada gaita tiene 3 notas base (N) + la nota Echo 'E' introducida en Iceborne.
Una melodía se puede tocar si todas sus notas están en set(N) | {'E'}.
"""

import sqlite3
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db" / "mhw.db"
OUTPUT_JSON = BASE_DIR / "songs_in_horns.json"

def generate_songs_in_horns():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Obtener todas las filas de weapon_melody_notes en orden de rowid (1..81)
    cur.execute("SELECT rowid, id, notes FROM weapon_melody_notes ORDER BY rowid")
    melody_notes_rows = cur.fetchall()

    # Obtener las combinaciones distintas de notas de hunting horns
    cur.execute("""
        SELECT DISTINCT notes
        FROM weapon
        WHERE weapon_type = 'hunting-horn' AND notes IS NOT NULL
        ORDER BY notes
    """)
    distinct_horn_notes = [r[0] for r in cur.fetchall()]

    songs_in_horns = {}
    for hn in distinct_horn_notes:
        valid_chars = set(hn) | {'E'}
        matching_indices = [
            rowid for rowid, mid, notes in melody_notes_rows
            if set(notes).issubset(valid_chars)
        ]
        songs_in_horns[hn] = matching_indices

    conn.close()

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(songs_in_horns, f, indent=2)

    print(f"Generado exitosamente {OUTPUT_JSON} con {len(songs_in_horns)} combinaciones de notas.")
    return songs_in_horns

if __name__ == "__main__":
    generate_songs_in_horns()
