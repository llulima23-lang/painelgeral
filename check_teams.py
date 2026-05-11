import json

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('const DASHBOARD_DATA = ', '').strip()
    if content.endswith(';'):
        content = content[:-1]
    data = json.loads(content)

prod_teams = set(d['operacao'] for d in data['producao_operacoes'] if d.get('operacao'))
fech_teams = set(d['operacao'] for d in data['fechamentos2026'] if d.get('operacao'))

print("PROD TEAMS:")
for t in sorted(prod_teams): print(f"  - {t}")
print("\nFECH TEAMS:")
for t in sorted(fech_teams): print(f"  - {t}")
