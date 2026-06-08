import pandas as pd
try:
    df = pd.read_excel(r'C:\Users\sup.luciana\Meu Drive\MF\MF\ABS\TRATADO - ABS.xlsx', sheet_name='Plan1', header=None)
    for r in range(len(df)):
        if df.iloc[r, 4] == 'GERAL':
            # Get month from col 1
            month = df.iloc[r, 1]
            abs_val = df.iloc[r, 11]
            print(f'Month: {month}, Row: {r}, ABS: {abs_val}')
except Exception as e:
    print(f'Error: {e}')
