import codecs
import os

def patch():
    file_path = r'C:\Users\sup.luciana\Desktop\AntiGravity\PAINEL GERAL\extract_data.py'
    with codecs.open(file_path, 'r', 'utf-8') as f:
        content = f.read()

    if "META GERAL 2026.xlsx" in content and "dispersao_data" in content:
        print("Já foi patcheado!")
        return

    insert_logic = """
# =============================================================
# EXTRAÇÃO DE DISPERSÃO E QUARTIL (META GERAL 2026.xlsx)
# =============================================================
print("  Extraindo dados de Dispersão da planilha META GERAL 2026...")
try:
    meta_path = r'C:\\Users\\sup.luciana\\Meu Drive\\MF\\MF\\Indicadores de Cobrança\\META GERAL 2026.xlsx'
    wb_meta = openpyxl.load_workbook(meta_path, data_only=True)
    
    # Filtrar abas que começam com "METAS " e têm "2026"
    meta_sheets = [s for s in wb_meta.sheetnames if s.startswith('METAS') and '2026' in s and 'Backup' not in s]
    
    mes_name_map = {
        'JANEIRO': 'janeiro', 'FEVEREIRO': 'fevereiro', 'MARCO': 'marco', 'MARÇO': 'marco',
        'ABRIL': 'abril', 'MAIO': 'maio', 'JUNHO': 'junho', 'JULHO': 'julho',
        'AGOSTO': 'agosto', 'SETEMBRO': 'setembro', 'OUTUBRO': 'outubro',
        'NOVEMBRO': 'novembro', 'DEZEMBRO': 'dezembro'
    }
    
    dispersao_data = {}
    
    for sh in meta_sheets:
        # Tentar descobrir o mês a partir do nome da aba
        sh_upper = strip_acc(sh).replace('METAS', '').replace('2026', '').strip()
        mes_key = mes_name_map.get(sh_upper, None)
        if not mes_key:
            for k, v in mes_name_map.items():
                if k in strip_acc(sh):
                    mes_key = v
                    break
        if not mes_key:
            continue
            
        ws_meta = wb_meta[sh]
        
        # O cabeçalho geralmente está na linha 4
        rows = list(ws_meta.iter_rows(min_row=4, max_row=ws_meta.max_row, values_only=True))
        headers = [strip_acc(str(h)) if h else '' for h in rows[0]]
        
        # Encontrar as colunas
        idx_agente = -1
        idx_op = -1
        idx_ho = -1
        idx_prom = -1
        
        for i, h in enumerate(headers):
            if 'AGENTE' in h: idx_agente = i
            elif 'OPERACAO' in h: idx_op = i
            elif 'H O' in h or h == 'HO': idx_ho = i
            elif 'PROMESSA' in h: idx_prom = i
            
        if idx_agente == -1 or idx_op == -1:
            continue
            
        ops_dict = {}
        for row in rows[1:]:
            agente = str(row[idx_agente]).strip() if idx_agente < len(row) and row[idx_agente] else None
            op = str(row[idx_op]).strip() if idx_op < len(row) and row[idx_op] else None
            
            if not agente or not op or agente.lower() == 'nan':
                continue
                
            ho = 0
            if idx_ho != -1 and idx_ho < len(row) and row[idx_ho] is not None:
                try: ho = float(row[idx_ho])
                except: pass
                
            prom = 0
            if idx_prom != -1 and idx_prom < len(row) and row[idx_prom] is not None:
                try: prom = float(row[idx_prom])
                except: pass
                
            if op not in ops_dict:
                ops_dict[op] = []
                
            ops_dict[op].append({
                'agente': agente,
                'ho': ho,
                'promessas': prom
            })
            
        # Agora calcular quartil e dispersão por operação
        mes_result = {}
        
        for op, ops_list in ops_dict.items():
            # HO
            validos_ho = [x for x in ops_list if x['ho'] > 0]
            validos_ho.sort(key=lambda x: x['ho'], reverse=True)
            max_ho = max([x['ho'] for x in validos_ho], default=0)
            n_ho = len(validos_ho)
            
            for rank, r in enumerate(validos_ho):
                pct = rank / max(1, n_ho - 1)
                if n_ho <= 1: q = 1
                elif pct <= 0.25: q = 1
                elif pct <= 0.50: q = 2
                elif pct <= 0.75: q = 3
                else: q = 4
                
                r['_q_ho'] = f"{q}º Quartil"
                r['_disp_ho'] = round((r['ho'] / max_ho * 100), 1) if max_ho > 0 else 0
                
            # Promessas
            validos_prom = [x for x in ops_list if x['promessas'] > 0]
            validos_prom.sort(key=lambda x: x['promessas'], reverse=True)
            max_prom = max([x['promessas'] for x in validos_prom], default=0)
            n_prom = len(validos_prom)
            
            for rank, r in enumerate(validos_prom):
                pct = rank / max(1, n_prom - 1)
                if n_prom <= 1: q = 1
                elif pct <= 0.25: q = 1
                elif pct <= 0.50: q = 2
                elif pct <= 0.75: q = 3
                else: q = 4
                
                r['_q_prom'] = f"{q}º Quartil"
                r['_disp_prom'] = round((r['promessas'] / max_prom * 100), 1) if max_prom > 0 else 0
                
            # Keep ALL ops, not just valid ones
            mes_result[op] = ops_list
            
        dispersao_data[mes_key] = mes_result
        print(f"    {sh}: {len(ops_dict)} operações processadas.")
        
    all_data['dispersao_data'] = dispersao_data
    print("  Dispersão OK!")
    
except Exception as e:
    print(f"  Warning: Falha ao extrair dispersao de META GERAL 2026: {e}")
    import traceback
    traceback.print_exc()

"""

    parts = content.split("# =============================================================\r\n# Write data.js")
    if len(parts) == 1:
        parts = content.split("# =============================================================\n# Write data.js")
        
    if len(parts) == 2:
        new_content = parts[0] + insert_logic + "\n# =============================================================\n# Write data.js" + parts[1]
        with codecs.open(file_path, 'w', 'utf-8') as f:
            f.write(new_content)
        print("Patcheado com sucesso!")
    else:
        print("Falha ao encontrar o ponto de injeção.")

if __name__ == "__main__":
    patch()
