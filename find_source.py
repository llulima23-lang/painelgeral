import pandas as pd
try:
    xl = pd.ExcelFile(r'C:\Users\sup.luciana\Meu Drive\MF\MF\ABS\TRATADO - ABS.xlsx')
    target = 0.031489
    for s in xl.sheet_names:
        df = xl.parse(s, header=None)
        # Search for values close to target
        for r in range(len(df)):
            for c in range(len(df.columns)):
                val = df.iloc[r, c]
                if isinstance(val, (int, float)) and abs(val - target) < 0.0001:
                    print(f'Found {val} in sheet: {s}, Row {r}, Col {c}')
except Exception as e:
    print(f'Error: {e}')
