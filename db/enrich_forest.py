import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db" / "mhw.db"
FOREST_JSON = BASE_DIR / "horn_crafting_forest.json"

COLOR_NAMES = ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'purple']

def parse_sharpness(sharpness_str, sharpness_maxed):
    if not sharpness_str:
        return {
            "sharpness": "",
            "sharpness_maxed": 1,
            "sharpness_max": [0]*7,
            "sharpness_base": [0]*7,
            "handicraft": [0]*7,
            "base_color": "none",
            "max_color": "none",
            "has_upgrade": False
        }
    
    parts = [int(x.strip()) for x in sharpness_str.split(',')]
    while len(parts) < 7:
        parts.append(0)
    parts = parts[:7]
    
    max_parts = list(parts)
    max_color = "red"
    for c, val in zip(COLOR_NAMES, max_parts):
        if val > 0:
            max_color = c
            
    is_maxed = bool(sharpness_maxed)
    if is_maxed:
        base_parts = list(max_parts)
        handicraft_parts = [0] * 7
        base_color = max_color
    else:
        # Subtract 50 from the top backwards
        to_remove = 50
        base_parts = list(max_parts)
        handicraft_parts = [0] * 7
        for i in range(6, -1, -1):
            if to_remove <= 0:
                break
            if base_parts[i] > 0:
                deduct = min(to_remove, base_parts[i])
                base_parts[i] -= deduct
                handicraft_parts[i] = deduct
                to_remove -= deduct
                
        base_color = "red"
        for c, val in zip(COLOR_NAMES, base_parts):
            if val > 0:
                base_color = c
                
    return {
        "sharpness": sharpness_str,
        "sharpness_maxed": 1 if is_maxed else 0,
        "sharpness_max": max_parts,
        "sharpness_base": base_parts,
        "handicraft": handicraft_parts,
        "base_color": base_color,
        "max_color": max_color,
        "has_upgrade": base_color != max_color
    }

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
      w.elderseal,
      w.sharpness,
      w.sharpness_maxed,
      w.slot_1,
      w.slot_2,
      w.slot_3
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
    
    sh_info = parse_sharpness(w.get("sharpness"), w.get("sharpness_maxed"))
    node["sharpness"] = sh_info["sharpness"]
    node["sharpness_maxed"] = sh_info["sharpness_maxed"]
    node["sharpness_max"] = sh_info["sharpness_max"]
    node["sharpness_base"] = sh_info["sharpness_base"]
    node["handicraft"] = sh_info["handicraft"]
    node["base_color"] = sh_info["base_color"]
    node["max_color"] = sh_info["max_color"]
    node["has_sharpness_upgrade"] = sh_info["has_upgrade"]

    s1 = w.get("slot_1") or 0
    s2 = w.get("slot_2") or 0
    s3 = w.get("slot_3") or 0
    slots = [s for s in [s1, s2, s3] if s > 0]
    node["slots"] = slots
    node["slots_total"] = sum(slots)

    for child in node.get("children", []):
        enrich_node(child)

for tree in data["forest"]:
    enrich_node(tree)

with open(FOREST_JSON, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully enriched {FOREST_JSON} with sharpness, elemental & elderseal data.")
