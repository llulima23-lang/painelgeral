import json
from collections import Counter

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('const DASHBOARD_DATA = ', '').strip()
    if content.endswith(';'):
        content = content[:-1]
    data = json.loads(content)

counts = Counter((o['agente'], o['mes'], o['ano']) for o in data['operadores'])
duplicates = {k: v for k, v in counts.items() if v > 1}
if duplicates:
    print("Duplicates found (Agent, Mes, Ano):")
    for k, v in duplicates.items():
        print(f"{k}: {v} rows")
else:
    print("No duplicates found for (Agent, Mes, Ano).")
