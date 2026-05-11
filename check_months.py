import json

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('const DASHBOARD_DATA = ', '').strip()
    if content.endswith(';'):
        content = content[:-1]
    data = json.loads(content)

print("--- OPERADORES ---")
op_months = set((o.get('mes'), o.get('ano')) for o in data['operadores'])
for m, y in sorted(list(op_months), key=lambda x: (str(x[1]), str(x[0]))):
    print(f"Month: {m}, Year: {y}")

print("\n--- PRODUCAO OPERACOES ---")
prod_months = set((o.get('mes'), o.get('ano')) for o in data['producao_operacoes'])
for m, y in sorted(list(prod_months), key=lambda x: (str(x[1]), str(x[0]))):
    print(f"Month: {m}, Year: {y}")
