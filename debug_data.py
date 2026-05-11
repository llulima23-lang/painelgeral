import json
import os

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('const DASHBOARD_DATA = ', '').strip()
    if content.endswith(';'):
        content = content[:-1]
    data = json.loads(content)
    
# Check first 5 rows of producao_operacoes to see month format
print("Sample rows:")
for d in data['producao_operacoes'][:5]:
    print(f"Mes: {d['mes']}, Ano: {d.get('ano')}, Op: {d['operacao']}")

years = set(o.get('ano') for o in data['operadores'])
print(f"Years found in operators: {years}")

target = [o for o in data['operadores'] if str(o.get('ano')) == '2026']
print(f"Total operators for 2026: {len(target)}")
if target:
    print(json.dumps(target[0], indent=2))
