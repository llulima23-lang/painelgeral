import json

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('const DASHBOARD_DATA = ', '').strip()
    if content.endswith(';'):
        content = content[:-1]
    data = json.loads(content)

print("Various Tempo Logado samples:")
for op in data['operadores'][:50]:
    if op.get('tempo_logado'):
        print(f"Agent: {op['agente']} | Val: {op['tempo_logado']} | Type: {type(op['tempo_logado'])}")
