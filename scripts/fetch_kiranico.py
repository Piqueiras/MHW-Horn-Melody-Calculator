import urllib.request
import ssl
import re
import json
from html import unescape

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://mhworld.kiranico.com/en/weapons?type=5"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

with open('horn_crafting_forest.json', encoding='utf-8') as f:
    forest_data = json.load(f)

forest_names = set()
def walk(n):
    forest_names.add(n['name_en'])
    for c in n.get('children', []):
        walk(c)
for r in forest_data['forest']:
    walk(r)

print(f"Target weapons in forest: {len(forest_names)}")

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    html = resp.read().decode('utf-8', errors='ignore')
    print(f"Fetched {len(html)} characters.")

# Look for weapon links
matches = re.findall(r'href="([^"]*?/weapons/([a-zA-Z0-9_-]+)/([^"#?]+))"[^>]*>(.*?)</a>', html, re.DOTALL)
print(f"Found {len(matches)} weapon link matches on page.")

kiranico_map = {}
all_scraped = {}

for full_path, hash_id, slug, text in matches:
    clean_name = re.sub(r'<[^>]+>', '', text).strip()
    clean_name = unescape(clean_name)
    
    if full_path.startswith('/'):
        full_url = f"https://mhworld.kiranico.com{full_path}"
    else:
        full_url = full_path
        
    all_scraped[clean_name] = full_url
    if clean_name in forest_names:
        kiranico_map[clean_name] = full_url

print(f"Unique scraped weapons: {len(all_scraped)}")
print(f"Direct match with forest: {len(kiranico_map)} / {len(forest_names)}")

# Check missing and try slug matching
missing = forest_names - set(kiranico_map.keys())
if missing:
    print(f"\nMissing {len(missing)} forest weapons initially:")
    # Build slug to url map
    slug_map = {}
    for full_path, hash_id, slug, text in matches:
        slug_norm = slug.replace('-', ' ').strip().lower()
        if full_path.startswith('/'):
            full_url = f"https://mhworld.kiranico.com{full_path}"
        else:
            full_url = full_path
        slug_map[slug_norm] = full_url

    unmatched = []
    for m in sorted(missing):
        # try normalize name to slug
        m_norm = m.replace('+', '').replace('"', '').replace("'", '').strip().lower()
        # also try exact lower
        m_exact_lower = m.lower()
        found = None
        for s_norm, u in slug_map.items():
            if m_exact_lower == s_norm or m_norm == s_norm.replace('+', '').replace('"', '').replace("'", ''):
                found = u
                break
        if found:
            kiranico_map[m] = found
            print(f"  Matched via slug: '{m}' -> {found}")
        else:
            unmatched.append(m)

    if unmatched:
        print(f"\nStill missing {len(unmatched)}:")
        for u in unmatched:
            print(f"  - {u}")
        print("\nSome scraped names that didn't match:")
        for name in list(all_scraped.keys())[:20]:
            if name not in kiranico_map:
                print(f"  Scraped unused: {name}")

print(f"\nFinal Matched: {len(kiranico_map)} / {len(forest_names)}")

# Save to kiranico_urls.json
with open('kiranico_urls.json', 'w', encoding='utf-8') as f:
    json.dump(kiranico_map, f, indent=2, ensure_ascii=False)
