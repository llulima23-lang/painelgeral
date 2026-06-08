import openpyxl
XLSX = r'C:\Users\sup.luciana\Meu Drive\MF\MF\Indicadores de Cobrança\PRODUÇÃO EQUIPES.xlsx'
wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb['PRODUÇÃO OPERADORES']

print("Checking first 10 rows for Pause columns:")
for i, row in enumerate(ws.iter_rows(min_row=2, max_row=11, values_only=True)):
    print(f"Row {i+2}: Agente={row[0]}, col21(ALCANCE PAUSA)={row[21]}, col22(PAUSA 100%)={row[22]}")
