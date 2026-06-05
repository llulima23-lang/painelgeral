import openpyxl
from datetime import datetime
XLSX = r'C:\Users\sup.luciana\Meu Drive\MF\MF\Indicadores de Cobrança\PRODUÇÃO EQUIPES.xlsx'
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
sheet = wb['PRODUÇÃO OPERAÇÕES']
found = False
for i, r in enumerate(sheet.iter_rows(values_only=True), 1):
    if r[1] and 'Hapvida' in str(r[1]):
        dt = r[13]
        if isinstance(dt, datetime) and dt.year == 2026 and dt.month == 4:
            print(f"Row {i}: {r}")
            found = True
if not found:
    print("No Hapvida data found for April 2026 in PRODUÇÃO OPERAÇÕES")
