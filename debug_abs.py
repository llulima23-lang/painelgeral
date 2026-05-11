import json
try:
    with open('data.js', 'r', encoding='utf-8') as f:
        content = f.read()
    start = content.find('{')
    end = content.rfind('}')
    data_str = content[start:end+1]
    data = json.loads(data_str)
    abs_data = data.get('abs_data', {})
    print(f"Total months found: {len(abs_data)}")
    for k, v in abs_data.items():
        print(f"Month: {k}")
        print(f"  Overall: {v.get('overall')}")
        teams = v.get('teams', {})
        print(f"  Teams ({len(teams)}): {list(teams.keys())}")
except Exception as e:
    print(f"Error: {e}")
