import sqlite3
import tkinter as tk
from tkinter import ttk

from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "mhw.db"

def fetch_horns():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT w.id, wt.name as name_en, w.previous_weapon_id, w.notes
        FROM weapon w
        LEFT JOIN weapon_text wt ON wt.id = w.id AND wt.lang_id='en'
        WHERE w.weapon_type='hunting-horn'
    """)
    rows = cur.fetchall()
    conn.close()
    return {r["id"]: dict(r) for r in rows}

def build_tree(parent_id, tree, parent_gui, horns):
    for wid, r in horns.items():
        if r["previous_weapon_id"] == parent_id:
            node_text = f"{r['name_en']} [{r['notes']}]"
            new_parent = tree.insert(parent_gui, "end", text=node_text, open=True)
            build_tree(wid, tree, new_parent, horns)

if __name__ == "__main__":
    horns = fetch_horns()

    root = tk.Tk()
    root.title("Hunting Horn Trees")

    tree = ttk.Treeview(root)
    tree.pack(fill="both", expand=True)

    # Raíces = armas sin previous_weapon_id
    for wid, r in horns.items():
        if not r["previous_weapon_id"]:
            node_text = f"{r['name_en']} [{r['notes']}]"
            parent = tree.insert("", "end", text=node_text, open=True)
            build_tree(wid, tree, parent, horns)

    root.mainloop()
