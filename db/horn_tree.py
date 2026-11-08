#!/usr/bin/env python3
"""
Construye árboles de crafting para hunting-horns desde mhw.db.
Imprime TODOS los árboles (incluye árboles de 1 nodo) y exporta JSON.
"""

import sqlite3
import json
from typing import Dict, List, Any, Set

DB_PATH = "mhw.db"   # <- fichero correcto

Q_FETCH_HORNS = """
SELECT
  w.id,
  wt.name AS name_en,
  w.previous_weapon_id,
  w.notes,
  w.rarity,
  w.attack,
  w.craftable,
  w.final
FROM weapon w
LEFT JOIN weapon_text wt ON wt.id = w.id AND wt.lang_id = 'en'
WHERE w.weapon_type = 'hunting-horn'
ORDER BY w.id;
"""

def fetch_rows(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(Q_FETCH_HORNS)
    rows = [dict(r) for r in cur.fetchall()]
    return rows

def build_children_map(rows: List[Dict[str, Any]]) -> Dict[int, List[int]]:
    children: Dict[int, List[int]] = {}
    for r in rows:
        wid = int(r["id"])
        children.setdefault(wid, [])
    for r in rows:
        wid = int(r["id"])
        prev = r.get("previous_weapon_id")
        if prev not in (None, 0):
            try:
                pid = int(prev)
                children.setdefault(pid, []).append(wid)
            except Exception:
                pass
    return children

def build_tree_rec(wid: int,
                   rows_map: Dict[int, Dict[str, Any]],
                   children_map: Dict[int, List[int]],
                   visited: Set[int],
                   depth: int = 0,
                   max_depth: int = 500) -> Dict[str, Any]:
    if depth > max_depth:
        return {"id": wid, "name": rows_map.get(wid, {}).get("name_en"), "note": "max_depth_reached", "children": []}
    if wid in visited:
        return {"id": wid, "name": rows_map.get(wid, {}).get("name_en"), "cycle": True, "children": []}
    visited.add(wid)
    row = rows_map.get(wid, {})
    node = {
        "id": wid,
        "name_en": row.get("name_en"),
        "notes": row.get("notes"),
        "rarity": row.get("rarity"),
        "attack": row.get("attack"),
        "craftable": bool(row.get("craftable")),
        "final": bool(row.get("final")),
        "children": []
    }
    for child_id in children_map.get(wid, []):
        child_node = build_tree_rec(child_id, rows_map, children_map, visited, depth + 1, max_depth)
        node["children"].append(child_node)
    visited.remove(wid)
    return node

def find_roots(rows: List[Dict[str, Any]], children_map: Dict[int, List[int]]) -> List[int]:
    all_ids = {int(r["id"]) for r in rows}
    child_ids = set()
    for lst in children_map.values():
        child_ids.update(lst)
    roots = sorted(list(all_ids - child_ids))
    if not roots:
        roots = sorted([int(r["id"]) for r in rows if r.get("previous_weapon_id") in (None, 0)])
    return roots

def pretty_print(node: Dict[str, Any], indent: int = 0):
    prefix = "  " * indent
    cycle = " [CYCLE]" if node.get("cycle") else ""
    note = f" ({node.get('note')})" if node.get("note") else ""
    print(f"{prefix}- {node.get('name_en')} (ID:{node.get('id')}) notes={node.get('notes')} rarity={node.get('rarity')}{cycle}{note}")
    for c in node.get("children", []):
        pretty_print(c, indent + 1)

def export_json(obj: Any, path: str = "horn_crafting_forest.json"):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"Exportado JSON a: {path}")

if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = fetch_rows(conn)
        print(f"Encontradas {len(rows)} hunting-horns en la tabla 'weapon'")

        children_map = build_children_map(rows)
        rows_map = {int(r["id"]): r for r in rows}
        roots = find_roots(rows, children_map)
        print(f"Roots detectadas: {len(roots)}")

        forest = []
        single_node_trees = []
        for r in roots:
            node = build_tree_rec(r, rows_map, children_map, visited=set(), max_depth=500)
            forest.append(node)
            # detectar árboles de 1 nodo (raíz sin hijos)
            if not children_map.get(r):
                single_node_trees.append({"id": r, "name_en": rows_map[r].get("name_en"), "notes": rows_map[r].get("notes")})

        # Imprimir todos los árboles (si son muchos, la consola mostrará todo)
        for i, t in enumerate(forest, start=1):
            print(f"\nÁrbol raíz #{i}:")
            pretty_print(t)

        # Resumen
        print("\n--- Resumen ---")
        print(f"Nº de árboles (raíces): {len(forest)}")
        print(f"Nº de árboles de 1 nodo (arma solo): {len(single_node_trees)}")
        if single_node_trees:
            print("Ejemplos de árboles de 1 nodo (primeros 20):")
            for s in single_node_trees[:20]:
                print(f"  - {s['id']}: {s['name_en']}  notes={s['notes']}")

        # Exportar JSON completo
        export_json({"forest": forest, "children_map": children_map}, path="horn_crafting_forest.json")

    finally:
        conn.close()
