import json

with open('kiranico_urls.json', encoding='utf-8') as f:
    urls = json.load(f)

with open('horn_crafting_forest.json', encoding='utf-8') as f:
    data = json.load(f)

count = 0
missing = []

def update_node(node):
    global count
    name = node.get('name_en')
    if name in urls:
        node['kiranico_url'] = urls[name]
        count += 1
    else:
        missing.append(name)
        
    for child in node.get('children', []):
        update_node(child)

for root in data['forest']:
    update_node(root)

print(f"Updated {count} nodes with kiranico_url.")
if missing:
    print(f"Missing {len(missing)} nodes:", missing)
else:
    print("All nodes successfully updated!")

with open('horn_crafting_forest.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
