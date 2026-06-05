import openpyxl
XLSX = r'C:\Users\sup.luciana\Meu Drive\MF\MF\Indicadores de Cobrança\PRODUÇÃO EQUIPES.xlsx'
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
sheet = wb['FECHAMENTOS 2026']
for i, row in enumerate(sheet.iter_rows(values_only=True), 1):
    if row[1] and 'Hapvida' in str(row[1]) and row[0] and str(row[0]).strip().lower() == 'abril':
        print(f"Row {i}: {row}")
        print(f"Type of cell[2]: {type(row[2])}")
