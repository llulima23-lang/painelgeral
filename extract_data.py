import openpyxl
import json
from datetime import datetime, time, timedelta

def serialize(v):
    if isinstance(v, datetime):
        return v.isoformat()
    elif isinstance(v, time):
        return str(v)
    elif isinstance(v, timedelta):
        total = int(v.total_seconds())
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    elif isinstance(v, str) and v in ('#DIV/0!', '#REF!', 'LICENÇA', 'LICENÃ\x87A'):
        return None
    return v

wb = openpyxl.load_workbook(r'C:\Users\sup.luciana\Meu Drive\MF\MF\Indicadores de Cobrança\PRODUÇÃO EQUIPES.xlsx', data_only=True)

all_data = {}

# --- PRODUÇÃO OPERADORES ---
ws = wb['PRODUÇÃO OPERADORES']
headers = ['agente','operacao','admissao','matricula','ho','alcance_ho','dispersao','comissao_op',
           'cpc','promessa','meta','prom_cpc','qualidade','alcance_qualidade','abs',
           'quartil_ho','quartil_prom','tempo_logado','alcance_tl','pausa','alcance_pausa',
           'pausa_100','media_final','mes','y1','z1','aa1']
operators = []
for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
    if row[0] is None:
        continue
    rec = {}
    for i, h in enumerate(headers):
        if i < len(row):
            val = serialize(row[i])
            if val is not None:
                rec[h] = val
    # Clean up non-needed fields
    for k in ['y1','z1','aa1']:
        rec.pop(k, None)
    if rec.get('mes'):
        operators.append(rec)
all_data['operadores'] = operators

# --- META 2025 ---
ws = wb['META 2025']
meta2025 = []
for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
    if row[0] is None:
        continue
    rec = {
        'mes': str(row[0]),
        'operacao': str(row[1]) if row[1] else None,
        'arrecadado': row[2],
        'meta': row[3],
        'faturamento': row[4],
        'alcance': row[5]
    }
    meta2025.append(rec)
all_data['meta2025'] = meta2025

# --- META 2024 ---
ws = wb['META 2024']
meta2024 = []
for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
    if row[0] is None:
        continue
    rec = {
        'mes': str(row[0]),
        'operacao': str(row[1]) if row[1] else None,
        'arrecadado': row[2],
        'meta': row[3],
        'faturamento': row[4],
        'alcance': row[5]
    }
    meta2024.append(rec)
all_data['meta2024'] = meta2024

# --- META CNU ---
ws = wb['META CNU']
meta_cnu = []
for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
    if row[0] is None:
        continue
    rec = {
        'mes': str(row[0]),
        'operacao': str(row[1]) if row[1] else None,
        'arrecadado': row[2],
        'meta': row[3],
        'alcance': row[4],
        'ano': row[5]
    }
    meta_cnu.append(rec)
all_data['meta_cnu'] = meta_cnu

# --- QUARTIL ---
ws = wb['QUARTIL']
quartil = []
for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
    vals = [serialize(v) for v in row]
    if any(v is not None for v in vals):
        quartil.append(vals)
all_data['quartil_raw'] = quartil

# --- PRODUÇÃO OPERAÇÕES ---
ws = wb['PRODUÇÃO OPERAÇÕES']
prod_ops = []
for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
    if row[0] is None:
        continue
    rec = {
        'carteira': str(row[0]),
        'operacao': str(row[1]) if row[1] else None,
        'ho': row[2],
        'dispersao': serialize(row[3]),
        'alo': row[4],
        'cpc': row[5],
        'promessa': row[6],
        'qualidade': serialize(row[7]),
        'abs': serialize(row[8]),
        'tempo_logado': serialize(row[9]),
        'pct_tempo_log': serialize(row[10]),
        'pausa': serialize(row[11]),
        'pct_pausa': serialize(row[12]),
        'mes': serialize(row[13])
    }
    prod_ops.append(rec)
all_data['producao_operacoes'] = prod_ops

# --- CAPACITY ---
ws = wb['CAPACITY']
capacity = {}
for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
    vals = [serialize(v) for v in row]
    if any(v is not None for v in vals):
        capacity[str(vals)] = vals
all_data['capacity_raw'] = [list(row) for row in ws.iter_rows(min_row=4, max_row=10, values_only=True)]

# --- Planilha1 (Honorários) ---
ws = wb['Planilha1']
honorarios = []
for row in ws.iter_rows(min_row=3, max_row=16, values_only=True):
    vals = [serialize(v) for v in row]
    honorarios.append(vals)
all_data['honorarios'] = honorarios

# --- FECHAMENTOS 2026 ---
ws = wb['FECHAMENTOS 2026']
fechamentos = []
for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
    vals = [serialize(v) for v in row]
    if any(v is not None for v in vals):
        fechamentos.append(vals)
all_data['fechamentos2026'] = fechamentos

# --- CUSTOS ---
ws = wb['CUSTOS']
custos = []
for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
    vals = [serialize(v) for v in row]
    if any(v is not None for v in vals):
        custos.append(vals)
all_data['custos'] = custos

# --- FATURAMENTO AGORACRED ---
ws = wb['FATURAMENTO AGORACRED- PLANO']
fat_agora = []
for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
    vals = [serialize(v) for v in row]
    if any(v is not None for v in vals):
        fat_agora.append(vals)
all_data['faturamento_agoracred'] = fat_agora

# Write JSON
with open(r'c:\Users\sup.luciana\Desktop\AntiGravity\PAINEL GERAL\data.js', 'w', encoding='utf-8') as f:
    f.write('const DASHBOARD_DATA = ')
    json.dump(all_data, f, ensure_ascii=False, default=str, indent=None)
    f.write(';')

print(f"Data exported successfully!")
print(f"Operators: {len(operators)}")
print(f"Meta 2025: {len(meta2025)}")
print(f"Meta 2024: {len(meta2024)}")
print(f"Meta CNU: {len(meta_cnu)}")
print(f"Prod Ops: {len(prod_ops)}")
