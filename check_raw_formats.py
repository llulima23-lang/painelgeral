import json

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('const DASHBOARD_DATA = ', '').strip()
    if content.endswith(';'):
        content = content[:-1]
    data = json.loads(content)

print("Sample operator record:")
if data['operadores']:
    op = data['operadores'][0]
    for k, v in op.items():
        print(f"{k}: {v} ({type(v)})")
