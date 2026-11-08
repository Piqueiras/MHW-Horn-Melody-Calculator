import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db" / "mhw.db"
FOREST_JSON = BASE_DIR / "horn_crafting_forest.json"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("""
    SELECT
      w.id,
      w.element1,
      w.element1_attack,
      w.element_hidden,
      w.affinity,
      w.defense,
      w.elderseal
    FROM weapon w
    WHERE w.weapon_type = 'hunting-horn'
""")
weapon_data = {r["id"]: dict(r) for r in cur.fetchall()}
conn.close()

with open(FOREST_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

def enrich_node(node):
    wid = node["id"]
    w = weapon_data.get(wid, {})
    node["element"] = w.get("element1")
    node["element_attack"] = w.get("element1_attack")
    node["element_hidden"] = bool(w.get("element_hidden"))
    node["affinity"] = w.get("affinity") or 0
    node["defense"] = w.get("defense") or 0
    node["elderseal"] = w.get("elderseal")

    for child in node.get("children", []):
        enrich_node(child)

for tree in data["forest"]:
    enrich_node(tree)

with open(FOREST_JSON, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully enriched {FOREST_JSON} with elemental & elderseal data.")
