import pandas as pd
try:
    xl = pd.ExcelFile(r'C:\Users\sup.luciana\Meu Drive\MF\MF\ABS\TRATADO - ABS.xlsx')
    for s in xl.sheet_names:
        df = xl.parse(s, header=None)
        # Search for 'ABS' in any cell
        mask = df.astype(str).apply(lambda x: x.str.contains('ABS', na=False))
        if mask.any().any():
            print(f'Found ABS in sheet: {s}')
            # Find the first occurrence
            for r in range(len(df)):
                for c in range(len(df.columns)):
                    if 'ABS' in str(df.iloc[r, c]):
                        print(f'  - Row {r}, Col {c}: {df.iloc[r, c]}')
except Exception as e:
    print(f'Error: {e}')
