import sqlite3
import networkx as nx
import matplotlib.pyplot as plt

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
    return rows

def build_graph(rows):
    G = nx.DiGraph()
    for r in rows:
        G.add_node(r["id"], label=f"{r['name_en']}\n({r['notes']})")
        if r["previous_weapon_id"]:
            G.add_edge(r["previous_weapon_id"], r["id"])
    return G

if __name__ == "__main__":
    horns = fetch_horns()
    G = build_graph(horns)

    pos = nx.spring_layout(G, k=0.8, iterations=50)
    labels = nx.get_node_attributes(G, "label")

    plt.figure(figsize=(16, 12))
    nx.draw(G, pos, with_labels=True, labels=labels,
            node_size=2000, node_color="lightblue",
            font_size=8, arrowsize=12)
    plt.title("Hunting Horn Upgrade Trees")
    plt.show()
