import openpyxl
XLSX = r'C:\Users\sup.luciana\Meu Drive\MF\MF\Indicadores de Cobrança\PRODUÇÃO EQUIPES.xlsx'
wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb['PRODUÇÃO OPERADORES']
header = [str(c.value) for c in ws[1]]
print(f"Header: {header}")
print(f"Length: {len(header)}")
