import sqlite3
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db" / "mhw.db"
OUTPUT_JSON = BASE_DIR / "melodies.json"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("""
    SELECT
      m.id,
      t.name,
      t.effect1,
      t.effect2,
      m.base_duration,
      m.base_extension,
      m.m1_duration,
      m.m1_extension
    FROM weapon_melody m
    JOIN weapon_melody_text t ON m.id = t.id AND t.lang_id = 'en'
    ORDER BY m.id
""")

melodies = {}
for r in cur.fetchall():
    melodies[str(r["id"])] = {
        "id": str(r["id"]),
        "name": r["name"],
        "effect1": r["effect1"],
        "effect2": r["effect2"],
        "base_duration": r["base_duration"],
        "base_extension": r["base_extension"],
        "m1_duration": r["m1_duration"],
        "m1_extension": r["m1_extension"]
    }

conn.close()

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(melodies, f, ensure_ascii=False, indent=2)

print(f"Generated {OUTPUT_JSON} with {len(melodies)} melodies.")
