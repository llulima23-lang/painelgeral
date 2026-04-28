import json
with open('data.js', 'r', encoding='utf-8') as f:
    data = json.loads(f.read().replace('const DASHBOARD_DATA = ', '').rstrip(';'))
    ops = data['operadores']
    for o in ops[:3]:
        print(f"HO: {o.get('ho')}, Meta: {o.get('meta')}, Alcance HO: {o.get('alcance_ho')}")
