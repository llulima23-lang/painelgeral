import codecs
import re

file_path = r'C:\Users\sup.luciana\Desktop\AntiGravity\PAINEL GERAL\app.js'
with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

# We want to replace the dynamic calculation in renderCharts: dispersao
start_str = """                let opsFilter = (DASHBOARD_DATA.operadores || []).filter(o => {"""

end_str = """                carteirasList.sort((a,b) => b.validosHO.length - a.validosHO.length);"""

new_logic = """
                let dispersaoMesKeys = [];
                Object.keys(DASHBOARD_DATA.dispersao_data || {}).forEach(k => {
                    const [ano_k, mes_k] = k.split('-');
                    if (selAno.length > 0 && !selAno.includes(ano_k)) return;
                    if (selMes.length > 0 && !selMes.includes(mes_k)) return;
                    dispersaoMesKeys.push(k);
                });
                
                // Then collect the pre-calculated operators
                let grouped = {};
                dispersaoMesKeys.forEach(k => {
                    const monthData = DASHBOARD_DATA.dispersao_data[k];
                    Object.keys(monthData).forEach(op => {
                        if (!grouped[op]) grouped[op] = [];
                        grouped[op].push(...monthData[op]);
                    });
                });

                // Remove existing debug box if any
                const oldDebug = dispersaoGrid.parentNode.querySelector('.debug-dispersao');
                if (oldDebug) oldDebug.remove();

                let carteirasList = [];
                
                Object.keys(grouped).forEach(opName => {
                    const group = grouped[opName];
                    const validosHO = group.filter(o => o.ho > 0);
                    const validosProm = group.filter(o => o.promessas > 0);
                    
                    if (validosHO.length === 0 && validosProm.length === 0) return;
                    
                    const ho_n = validosHO.length;
                    const ho_max = Math.max(...validosHO.map(o => o.ho), 0);
                    const prom_max = Math.max(...validosProm.map(o => o.promessas), 0);
                    
                    let ho_disp_sum = 0;
                    let ho_disp_count = 0;
                    const ho_quartis = {1:[], 2:[], 3:[], 4:[]};
                    
                    validosHO.forEach(o => {
                        const val = o.ho;
                        const disp = o._disp_ho;
                        ho_disp_sum += disp;
                        ho_disp_count++;
                        
                        let q = parseInt(o._q_ho.charAt(0)) || 4;
                        ho_quartis[q].push({val, disp});
                    });
                    
                    const media_ho = ho_disp_count > 0 ? validosHO.reduce((acc, curr) => acc + curr.ho, 0) / ho_n : 0;
                    const media_dispersao_ho = ho_disp_count > 0 ? ho_disp_sum / ho_disp_count : 0;
                    
                    const prom_n = validosProm.length;
                    const prom_quartis = {1:[], 2:[], 3:[], 4:[]};
                    let prom_disp_sum = 0;
                    let prom_disp_count = 0;
                    
                    validosProm.forEach(o => {
                        const val = o.promessas;
                        const disp = o._disp_prom;
                        prom_disp_sum += disp;
                        prom_disp_count++;
                        
                        let q = parseInt(o._q_prom.charAt(0)) || 4;
                        prom_quartis[q].push({val, disp});
                    });
                    
                    const media_prom = prom_disp_count > 0 ? validosProm.reduce((acc, curr) => acc + curr.promessas, 0) / prom_n : 0;
                    const media_dispersao_prom = prom_disp_count > 0 ? prom_disp_sum / prom_disp_count : 0;
                    
                    // Filter Ana Lays from final display if needed
                    const displayGroup = group.filter(o => (o.agente || '').trim() !== 'Ana Lays Garces Lopes');
                    
                    // We only display the unique ones if there are duplicate agents (e.g. they worked multiple months selected)
                    // If multiple months are selected, average their dispersions? Or just list them? 
                    // To keep it simple, we list them all, but sort by dispHO.
                    
                    carteirasList.push({
                        op: opName,
                        ho_n, ho_max, media_ho, media_dispersao_ho, ho_quartis,
                        prom_n, prom_max, media_prom, media_dispersao_prom, prom_quartis,
                        validosHO: displayGroup.filter(o => o.ho > 0).map(o => ({
                            nome: o.agente || 'Sem Nome',
                            h_o: o.ho,
                            promessas: o.promessas,
                            dispHO: o._disp_ho,
                            dispProm: o._disp_prom
                        })).sort((a,b) => b.dispHO - a.dispHO)
                    });
                });
"""

idx1 = content.find(start_str)
idx2 = content.find(end_str)

if idx1 != -1 and idx2 != -1:
    new_content = content[:idx1] + new_logic + content[idx2:]
    with codecs.open(file_path, 'w', 'utf-8') as f:
        f.write(new_content)
    print("app.js patched successfully!")
else:
    print("Could not find insertion points in app.js!")

