document.addEventListener('DOMContentLoaded', () => {

    const initApp = () => {
        // Formatters
        const formatBRL = (v) => v !== undefined && v !== null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
        const formatNum = (v) => v !== undefined && v !== null ? v.toLocaleString('pt-BR') : '0';
        const formatPct = (v) => v !== undefined && v !== null ? (v * 100).toFixed(2).replace('.', ',') + '%' : '0,00%';

        const normalizeName = (name) => {
            if (!name) return '';
            return name.toString().toUpperCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/[^A-Z0-9]/g, ''); // Keep only alphanumeric
        };

        const { operadores, meta2025, meta2024, meta_cnu, producao_operacoes, fechamentos2026, abs_geral_timeline } = DASHBOARD_DATA;
        const absData = DASHBOARD_DATA.abs_data || {};
        const absGeralTimeline = abs_geral_timeline || [];

        const normalizeMonth = (m) => {
            if (!m) return '';
            let monthIdx = -1;
            if (typeof m === 'string' && m.includes('-')) {
                const parts = m.split('-');
                if (parts.length >= 2) monthIdx = parseInt(parts[1]) - 1;
            }
            const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
            if (monthIdx >= 0 && monthIdx < 12) return months[monthIdx];
            
            const date = new Date(m);
            if (isNaN(date)) return m.toString().toLowerCase().replace('ç','c').replace('ã','a').replace('á','a').replace('é','e').replace('ê','e').replace('í','i').replace('ó','o').replace('ô','o').replace('ú','u');
            return months[date.getUTCMonth()];
        };

        // ── Normalize month to accent-free lowercase (used consistently everywhere)
        const MONTHS_NORM = {
            'JANEIRO':'janeiro','FEVEREIRO':'fevereiro','MARCO':'marco','MARCO':'marco',
            'ABRIL':'abril','MAIO':'maio','JUNHO':'junho','JULHO':'julho',
            'AGOSTO':'agosto','SETEMBRO':'setembro','OUTUBRO':'outubro',
            'NOVEMBRO':'novembro','DEZEMBRO':'dezembro',
            'JAN':'janeiro','FEV':'fevereiro','MAR':'marco','ABR':'abril',
            'MAI':'maio','JUN':'junho','JUL':'julho','AGO':'agosto',
            'SET':'setembro','OUT':'outubro','NOV':'novembro','DEZ':'dezembro'
        };
        const stripAccents = (s) => s ? s.toString()
            .replace(/[çÇ]/g,'c').replace(/[ãÃáÁâÂàÀ]/g,'a')
            .replace(/[éÉêÊ]/g,'e').replace(/[íÍ]/g,'i')
            .replace(/[óÓôÔ]/g,'o').replace(/[úÚ]/g,'u') : '';
        const monthNameToNorm = (s) => {
            if (!s) return '';
            const up = stripAccents(s.toString().toUpperCase().trim());
            if (MONTHS_NORM[up]) return MONTHS_NORM[up];
            for (const [k,v] of Object.entries(MONTHS_NORM)) {
                if (up.startsWith(stripAccents(k))) return v;
            }
            return stripAccents(s.toString().toLowerCase());
        };

        const timeToSec = (t) => {
            if(!t || typeof t !== 'string') return 0;
            const p = t.split(':');
            if(p.length === 3) return parseInt(p[0])*3600 + parseInt(p[1])*60 + parseInt(p[2]);
            return 0;
        };
        const secToTime = (s) => {
            if(!s) return '-';
            const h = Math.floor(s/3600);
            const m = Math.floor((s%3600)/60);
            return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
        };

        const unifiedMeta = [];
        const addToUnified = (item, ano) => {
            const mesRaw = item.mes;
            if (!mesRaw || mesRaw === 'MÊS' || mesRaw === 'MES') return;
            const mesNorm = typeof mesRaw === 'string' && mesRaw.includes('-')
                ? normalizeMonth(mesRaw)
                : monthNameToNorm(mesRaw);
            if (!mesNorm) return;
            unifiedMeta.push({
                ano: ano || item.ano || 2024,
                mes: mesNorm,
                operacao: item.operacao || 'N/A',
                arrecadado: item.arrecadado || item.ho || item.faturamento || 0,
                meta: item.meta || 0
            });
        };

        // --- Build unifiedMeta ---
        meta2024.forEach(d => addToUnified(d, 2024));
        meta2025.forEach(d => addToUnified(d, 2025));
        if (meta_cnu) meta_cnu.forEach(d => addToUnified(d, d.ano));

        if (fechamentos2026) {
            fechamentos2026.forEach(d => addToUnified(d, 2026));
        }

        const getTeams = (arr) => {
            const s = new Set();
            arr.forEach(d => { if(d.operacao) s.add(d.operacao); });
            return [...s].sort();
        };

        const eqProd = getTeams(producao_operacoes);
        const eqMeta = getTeams(unifiedMeta);
        const eqOper = getTeams(operadores);

        // Month display names (accented for UI) mapped to normalized accent-free values
        const mesesOrdemOriginal = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
        const mesesNormValues   = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

        // HTML generator for filters
        const buildFiltersHTML = (panelId, teams, showQuartil = false) => {
            let teamsHTML = teams.map(t => `<label><input type="checkbox" value="${t}" class="opt-cb" checked> ${t}</label>`).join('');
            let mesesHTML = mesesOrdemOriginal.map((m, i) => `<label><input type="checkbox" value="${mesesNormValues[i]}" class="opt-cb" checked> ${m}</label>`).join('');
            let anosHTML = [2024, 2025, 2026].map(a => `<label><input type="checkbox" value="${a}" class="opt-cb" ${a === 2026 ? 'checked' : ''}> ${a}</label>`).join('');
            
            let html = `
                <div class="filter-group">
                    <label>Equipe</label>
                    <div class="custom-select dd-equipe" data-text="Equipes">
                        <div class="select-box"><span>Todas</span> <i class="fas fa-chevron-down"></i></div>
                        <div class="options-container">
                            <label><input type="checkbox" value="ALL" class="selectAll" checked> (Selecionar Todas)</label>
                            <div class="options-list">${teamsHTML}</div>
                        </div>
                    </div>
                </div>
                <div class="filter-group">
                    <label>Mês</label>
                    <div class="custom-select dd-mes" data-text="Meses">
                        <div class="select-box"><span>Todos</span> <i class="fas fa-chevron-down"></i></div>
                        <div class="options-container">
                            <label><input type="checkbox" value="ALL" class="selectAll" checked> (Selecionar Todos)</label>
                            <div class="options-list">${mesesHTML}</div>
                        </div>
                    </div>
                </div>
                <div class="filter-group">
                    <label>Ano</label>
                    <div class="custom-select dd-ano" data-text="Anos">
                        <div class="select-box"><span>1 selecionado</span> <i class="fas fa-chevron-down"></i></div>
                        <div class="options-container">
                            <label><input type="checkbox" value="ALL" class="selectAll"> (Selecionar Todos)</label>
                            <div class="options-list">${anosHTML}</div>
                        </div>
                    </div>
                </div>
            `;

            if (showQuartil) {
                html += `
                <div class="filter-group">
                    <label>Quartil H.O</label>
                    <div class="custom-select dd-quartil-ho" data-text="Quartis HO">
                        <div class="select-box"><span>Todos</span> <i class="fas fa-chevron-down"></i></div>
                        <div class="options-container">
                            <label><input type="checkbox" value="ALL" class="selectAll" checked> (Selecionar Todos)</label>
                            <div class="options-list">
                                <label><input type="checkbox" value="1" class="opt-cb" checked> 1º Quartil</label>
                                <label><input type="checkbox" value="2" class="opt-cb" checked> 2º Quartil</label>
                                <label><input type="checkbox" value="3" class="opt-cb" checked> 3º Quartil</label>
                                <label><input type="checkbox" value="4" class="opt-cb" checked> 4º Quartil</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="filter-group">
                    <label>Quartil Promessa</label>
                    <div class="custom-select dd-quartil-prom" data-text="Quartis Prom">
                        <div class="select-box"><span>Todos</span> <i class="fas fa-chevron-down"></i></div>
                        <div class="options-container">
                            <label><input type="checkbox" value="ALL" class="selectAll" checked> (Selecionar Todos)</label>
                            <div class="options-list">
                                <label><input type="checkbox" value="1" class="opt-cb" checked> 1º Quartil</label>
                                <label><input type="checkbox" value="2" class="opt-cb" checked> 2º Quartil</label>
                                <label><input type="checkbox" value="3" class="opt-cb" checked> 3º Quartil</label>
                                <label><input type="checkbox" value="4" class="opt-cb" checked> 4º Quartil</label>
                            </div>
                        </div>
                    </div>
                </div>`;
            }

            document.getElementById(`filters-${panelId}`).innerHTML = html;
        };

        buildFiltersHTML('overview', eqProd);
        buildFiltersHTML('faturamento', eqMeta);
        buildFiltersHTML('comparativo', eqMeta);
        buildFiltersHTML('operadores', eqOper, true);
        buildFiltersHTML('quartil', eqOper, true);

        const initSelects = () => {
            document.querySelectorAll('.custom-select').forEach(el => {
                const box = el.querySelector('.select-box');
                const textSpan = box.querySelector('span');
                const dataText = el.getAttribute('data-text');
                const selectAll = el.querySelector('.selectAll');
                const cbs = Array.from(el.querySelectorAll('.opt-cb'));

                // Initial text setup
                const updateText = () => {
                    const checkedCount = cbs.filter(cb => cb.checked).length;
                    if (checkedCount === 0) textSpan.textContent = 'Nenhum';
                    else if (checkedCount === cbs.length) textSpan.textContent = `Todos`;
                    else {
                        const selectedNames = cbs.filter(cb => cb.checked).map(cb => cb.value);
                        if (selectedNames.length <= 2) textSpan.textContent = selectedNames.join(', ');
                        else textSpan.textContent = `${checkedCount} itens`;
                    }
                    
                    // Only render if this filter belongs to the currently active panel
                    const parentPanel = el.closest('.panel');
                    if (parentPanel && parentPanel.classList.contains('active')) {
                        renderCharts();
                    }
                };

                selectAll.addEventListener('change', (e) => {
                    cbs.forEach(cb => cb.checked = e.target.checked);
                    updateText();
                });

                cbs.forEach(cb => {
                    cb.addEventListener('change', () => {
                        selectAll.checked = cbs.every(c => c.checked);
                        updateText();
                        
                        // Handle dynamic filtering for teams if month or year changed
                        if (el.classList.contains('dd-mes') || el.classList.contains('dd-ano')) {
                            const panel = el.closest('.panel');
                            if (panel) {
                                updateTeamFilter(panel.id.replace('panel-', ''));
                            }
                        }
                    });
                });

                box.addEventListener('click', (e) => {
                    document.querySelectorAll('.custom-select').forEach(other => {
                        if(other !== el) other.classList.remove('active');
                    });
                    el.classList.toggle('active');
                    e.stopPropagation();
                });

                const optionsContainer = el.querySelector('.options-container');
                if(optionsContainer) optionsContainer.addEventListener('click', e => e.stopPropagation());
            });
        };

        const updateTeamFilter = (panelId) => {
            const panel = document.getElementById(`panel-${panelId}`);
            if (!panel) return;
            
            const selMes = getSelected(panelId, 'dd-mes');
            const selAno = getSelected(panelId, 'dd-ano');
            const teamContainer = panel.querySelector('.dd-equipe .options-list');
            if (!teamContainer) return;

            // Find available teams for the selected period
            const availableTeams = new Set();
            
            if (panelId === 'overview') {
                // Check Production data
                producao_operacoes.forEach(d => {
                    if (!d.mes || !d.operacao) return;
                    const mNorm = d.mes;
                    const year = (d.ano || "").toString();
                    if ((selMes.length === 0 || selMes.includes(mNorm)) && (selAno.length === 0 || selAno.includes(year))) {
                        availableTeams.add(d.operacao);
                    }
                });
                // Also check Faturamento data (unifiedMeta)
                unifiedMeta.forEach(d => {
                    if ((selMes.length === 0 || selMes.includes(d.mes)) && (selAno.length === 0 || selAno.includes(d.ano.toString()))) {
                        if (d.operacao) availableTeams.add(d.operacao);
                    }
                });
            } else if (panelId === 'faturamento' || panelId === 'comparativo') {
                unifiedMeta.forEach(d => {
                    if (selMes.includes(d.mes) && selAno.includes(d.ano.toString())) {
                        if (d.operacao) availableTeams.add(d.operacao);
                    }
                });
            } else {
                operadores.forEach(o => {
                    if (o.mes) {
                        const mNorm = o.mes;
                        const year = (o.ano || "").toString();
                        if ((selMes.length === 0 || selMes.includes(mNorm)) && (selAno.length === 0 || selAno.includes(year))) {
                            if (o.operacao) availableTeams.add(o.operacao);
                        }
                    }
                });
            }

            const teams = Array.from(availableTeams).sort();
            const currentSelected = getSelected(panelId, 'dd-equipe');
            
            // Check if any of the previously selected teams are still available
            const stillAvailable = teams.filter(t => currentSelected.includes(t));
            const shouldCheckAll = currentSelected.length === 0 || stillAvailable.length === 0;

            teamContainer.innerHTML = teams.map(t => 
                `<label><input type="checkbox" value="${t}" class="opt-cb" ${shouldCheckAll || currentSelected.includes(t) ? 'checked' : ''}> ${t}</label>`
            ).join('');


            // Re-bind events
            const cbs = Array.from(teamContainer.querySelectorAll('.opt-cb'));
            const selectAll = panel.querySelector('.dd-equipe .selectAll');
            const textSpan = panel.querySelector('.dd-equipe .select-box span');

            const updateText = () => {
                const checkedCount = cbs.filter(cb => cb.checked).length;
                if (checkedCount === 0) textSpan.textContent = 'Nenhum';
                else if (checkedCount === cbs.length) textSpan.textContent = `Todos`;
                else {
                    const selectedNames = cbs.filter(cb => cb.checked).map(cb => cb.value);
                    if (selectedNames.length <= 2) textSpan.textContent = selectedNames.join(', ');
                    else textSpan.textContent = `${checkedCount} itens`;
                }
                renderCharts();
            };

            selectAll.checked = cbs.every(c => c.checked);
            
            cbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    selectAll.checked = cbs.every(c => c.checked);
                    updateText();
                });
            });

            selectAll.onchange = (e) => {
                cbs.forEach(cb => cb.checked = e.target.checked);
                updateText();
            };
        };

        initSelects();

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('active'));
        });

        const getSelected = (panelId, selClass) => {
            const panel = document.getElementById(`panel-${panelId}`);
            if (!panel) return [];
            return Array.from(panel.querySelectorAll(`.${selClass} .opt-cb:checked`)).map(cb => cb.value);
        };

        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        const panels = document.querySelectorAll('.panel');
        const title = document.getElementById('panelTitle');
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(i => i.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                item.classList.add('active');
                
                const pId = item.dataset.panel;
                document.getElementById(`panel-${pId}`).classList.add('active');
                title.textContent = item.querySelector('span').textContent;
                
                if (window.innerWidth <= 1024) sidebar.classList.remove('open');
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                    renderCharts(); // Re-render for the newly active panel using its specific filters
                }, 100);
            });
        });

        if(menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

        // Search Input binding
        const searchInput = document.getElementById('searchOperador');
        if(searchInput) searchInput.addEventListener('input', renderCharts);

        // Chart.js defaults
        Chart.register(ChartDataLabels);
        Chart.defaults.color = '#8b95b0';
        Chart.defaults.font.family = 'Inter';
        Chart.defaults.plugins.tooltip.backgroundColor = '#1a1f35';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.plugins.datalabels = {
            color: '#fff',
            font: { weight: 'bold', size: 10 },
            formatter: (val) => {
                if(val === 0 || !val) return '';
                if(val < 10 && val > 0 && val.toString().includes('.')) return val.toFixed(1) + '%';
                if(val > 1000) return (val/1000).toFixed(1) + 'k';
                return val;
            }
        };

        let charts = {};

        const opMatches = (val1, val2) => {
            if (!val1 || !val2) return false;
            const s1 = val1.toLowerCase().replace(/[^a-z0-9]/g, '');
            const s2 = val2.toLowerCase().replace(/[^a-z0-9]/g, '');
            return s1 === s2 || s1.includes(s2) || s2.includes(s1);
        };

        function renderCharts() {
            const activePanelId = document.querySelector('.panel.active').id.replace('panel-', '');

            const selEq = getSelected(activePanelId, 'dd-equipe');
            const selMes = getSelected(activePanelId, 'dd-mes');
            const selAno = getSelected(activePanelId, 'dd-ano');
            const selQuartilHO = getSelected(activePanelId, 'dd-quartil-ho');
            const selQuartilProm = getSelected(activePanelId, 'dd-quartil-prom');

            if (activePanelId === 'overview') {
                // ─── Helper: get ABS key (YYYY-MM) from a date string like "2026-01-01T00:00:00"
                const getAbsKey = (mesStr) => {
                    if (!mesStr) return null;
                    const d = new Date(mesStr);
                    if (isNaN(d)) return null;
                    const y = d.getUTCFullYear();
                    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
                    return `${y}-${m}`;
                };

                // ─── Filter producao_operacoes by team + month + year
                const filteredOps = producao_operacoes.filter(d => {
                    if (!selEq.some(eq => opMatches(d.operacao, eq))) return false;
                    if (!d.mes) return false;
                    
                    const mNorm = d.mes;
                    const year = (d.ano || "").toString();
                    
                    if (selAno.length > 0 && !selAno.includes(year)) return false;
                    if (selMes.length > 0 && !selMes.includes(mNorm)) return false;
                    return true;
                });

                // ─── Group by team — aggregate from PRODUÇÃO OPERAÇÕES
                const groupedOps = {};
                selEq.forEach(team => {
                    groupedOps[team] = {
                        ho: 0, promessa: 0, cpc: 0,
                        qSum: 0, qCount: 0,
                        pSum: 0, pCount: 0,
                        absSum: 0, absCount: 0, faltas: 0
                    };
                });

                // ─── Phase 1: Aggregate Faturamento from unifiedMeta (Now comprehensive for 2026)
                unifiedMeta.forEach(d => {
                    const mName = d.mes;
                    const year = d.ano.toString();
                    if (!selMes.includes(mName)) return;
                    if (!selAno.includes(year)) return;
                    
                    const matchTeam = selEq.find(t => opMatches(d.operacao, t));
                    if (!matchTeam) return;
                    
                    groupedOps[matchTeam].ho += Number(d.arrecadado || d.ho || 0);
                });

                // ─── Phase 2: Aggregate Operational KPIs from filteredOps
                filteredOps.forEach(d => {
                    const matchTeam = selEq.find(t => opMatches(d.operacao, t));
                    if (!matchTeam) return;
                    
                    const g = groupedOps[matchTeam];
                    
                    // CPC, Promessa are totals -> Sum them
                    g.promessa += Number(d.promessa || 0);
                    g.cpc      += Number(d.cpc || 0);
                    
                    // Qualidade, Pausa are percentages -> Average them
                    if (d.qualidade !== null && d.qualidade !== undefined && !isNaN(d.qualidade)) {
                        g.qSum += Number(d.qualidade); g.qCount++;
                    }
                    if (d.pct_pausa !== null && d.pct_pausa !== undefined && !isNaN(d.pct_pausa)) {
                        g.pSum += Number(d.pct_pausa); g.pCount++;
                    }
                });

                // ─── Build list of keys (unused for ABS now, but keeping month order logic if needed)
                const totalHO   = Object.values(groupedOps).reduce((s, a) => s + a.ho, 0);
                const totalCPC  = Object.values(groupedOps).reduce((s, a) => s + a.cpc, 0);
                const totalProm = Object.values(groupedOps).reduce((s, a) => s + a.promessa, 0);

                const withQ  = Object.values(groupedOps).filter(m => m.qCount > 0);
                const withP  = Object.values(groupedOps).filter(m => m.pCount > 0);
                const avgQual  = withQ.length > 0 ? withQ.reduce((s,m) => s + m.qSum/m.qCount, 0) / withQ.length : 0;
                const avgPausa = withP.length > 0 ? withP.reduce((s,m) => s + m.pSum/m.pCount, 0) / withP.length : 0;

                // ─── Phase 3: ABS Geral from the new timeline source
                let absGeralSum = 0, absGeralCount = 0;
                absGeralTimeline.forEach(d => {
                    if (selMes.includes(d.mes) && selAno.includes(d.ano.toString())) {
                        absGeralSum += (d.abs || 0);
                        absGeralCount++;
                    }
                });
                const absGeralFinal = absGeralCount > 0 ? absGeralSum / absGeralCount : 0;

                const kpiOverview = document.getElementById('kpiOverview');
                kpiOverview.innerHTML = `
                    <div class="kpi-card blue kpi-small"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-value small-val">${formatBRL(totalHO)}</div><div class="kpi-label">Total H.O</div></div>
                    <div class="kpi-card green kpi-small"><div class="kpi-icon"><i class="fas fa-handshake"></i></div><div class="kpi-value small-val">${formatNum(totalProm)}</div><div class="kpi-label">Total Promessas</div></div>
                    <div class="kpi-card rose kpi-small"><div class="kpi-icon"><i class="fas fa-user-check"></i></div><div class="kpi-value small-val">${formatNum(totalCPC)}</div><div class="kpi-label">Total CPC</div></div>
                    <div class="kpi-card amber kpi-small"><div class="kpi-icon"><i class="fas fa-star"></i></div><div class="kpi-value small-val">${formatPct(avgQual)}</div><div class="kpi-label">Média Qualidade</div></div>
                    <div class="kpi-card purple kpi-small"><div class="kpi-icon"><i class="fas fa-pause-circle"></i></div><div class="kpi-value small-val">${formatPct(avgPausa)}</div><div class="kpi-label">Média % Pausa</div></div>
                    <div class="kpi-card cyan kpi-small"><div class="kpi-icon"><i class="fas fa-user-slash"></i></div><div class="kpi-value small-val">${formatPct(absGeralFinal)}</div><div class="kpi-label">ABS Geral</div></div>
                `;

                // ─── Indicadores por Equipe (team cards)
                const teamCardsContainer = document.getElementById('teamCards');
                teamCardsContainer.innerHTML = '';
                const colors = ['blue', 'green', 'amber', 'rose', 'purple', 'cyan'];
                Object.keys(groupedOps).sort((a,b) => groupedOps[b].ho - groupedOps[a].ho).forEach((team, i) => {
                    const c = colors[i % colors.length];
                    const g = groupedOps[team];
                    const qual = g.qCount > 0 ? g.qSum / g.qCount : 0;
                    const pau  = g.pCount > 0 ? g.pSum / g.pCount : 0;
                    teamCardsContainer.innerHTML += `
                        <div class="kpi-card ${c}">
                            <div class="kpi-label" style="font-size:0.85rem;color:#fff;margin-bottom:10px;font-weight:700;">${team.substring(0,35)}</div>
                            <div class="kpi-value" style="font-size:1.3rem;">${formatBRL(g.ho)}</div>
                            <div style="font-size:0.75rem;margin-top:8px;color:var(--text-secondary);">
                                <i class="fas fa-check-circle"></i> CPC: ${formatNum(g.cpc)} &nbsp;|&nbsp; <i class="fas fa-handshake"></i> PROM: ${formatNum(g.promessa)}
                            </div>
                            <div style="font-size:0.75rem;margin-top:6px;color:rgba(255,255,255,0.9);display:flex;gap:10px;flex-wrap:wrap;">
                                <span><i class="fas fa-star"></i> QUALID: ${formatPct(qual)}</span>
                                <span><i class="fas fa-pause-circle"></i> PAUSA: ${formatPct(pau)}</span>
                            </div>
                        </div>
                    `;
                });

                // ─── Chart: Linha do Tempo (H.O por mês — Source: Combined)
                const timeSeries = {};
                const addToTS = (op, val, mNorm, year) => {
                    const mIdx = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'].indexOf(mNorm);
                    const dtSort = parseInt(year) * 100 + (mIdx >= 0 ? mIdx : 0);
                    const mShort = mNorm.substring(0, 3).toUpperCase();
                    const mKey = `${mShort} ${year}`;
                    
                    if (!timeSeries[mKey]) timeSeries[mKey] = { sortVal: dtSort };
                    const eq = selEq.find(t => opMatches(op, t)) || 'Outros';
                    timeSeries[mKey][eq] = (timeSeries[mKey][eq] || 0) + Number(val || 0);
                };

                // Add from producao_operacoes
                producao_operacoes.forEach(d => {
                    if (!d.mes || !d.operacao) return;
                    const mNorm = d.mes;
                    const year = (d.ano || "").toString();
                    if (year && selAno.includes(year)) {
                        addToTS(d.operacao, d.ho, mNorm, year);
                    }
                });

                // Fallback for teams NOT in production but in unifiedMeta
                unifiedMeta.forEach(d => {
                    if (!selAno.includes(d.ano.toString())) return;
                    const mShort = d.mes.substring(0, 3).toUpperCase();
                    const mKey = `${mShort} ${d.ano}`;
                    const eq = selEq.find(t => opMatches(d.operacao, t)) || 'Outros';
                    
                    // If we don't have this team/month in timeSeries yet, or the value is 0
                    if (!timeSeries[mKey] || !timeSeries[mKey][eq]) {
                        addToTS(d.operacao, d.arrecadado || d.ho || 0, d.mes, d.ano.toString());
                    }
                });

                const labelsTime = Object.keys(timeSeries).sort((a,b) => timeSeries[a].sortVal - timeSeries[b].sortVal);
                const chartColors = ['#3b82f6','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4'];

                if (charts.fatOverview) charts.fatOverview.destroy();
                charts.fatOverview = new Chart(document.getElementById('chartFatOverview'), {
                    type: 'line',
                    data: {
                        labels: labelsTime,
                        datasets: Object.keys(groupedOps).map((team, i) => ({
                            label: team.substring(0, 22),
                            data: labelsTime.map(l => timeSeries[l][team] || 0),
                            borderColor: chartColors[i % chartColors.length],
                            backgroundColor: chartColors[i % chartColors.length] + '22',
                            fill: true, tension: 0.3
                        }))
                    },
                    options: { plugins: { datalabels: { display: false } } }
                });

                // ─── Chart: Participação no Faturamento (Doughnut)
                if (charts.distOp) charts.distOp.destroy();
                charts.distOp = new Chart(document.getElementById('chartDistOp'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(groupedOps).map(l => l.substring(0, 22)),
                        datasets: [{ data: Object.values(groupedOps).map(d => d.ho), backgroundColor: chartColors, borderWidth: 0 }]
                    },
                    options: { cutout: '65%', plugins: { legend: { position: 'right' }, datalabels: { display: false } } }
                });

                // ─── Chart: Total de Promessas por Equipe (Bar)
                if (charts.promessas) charts.promessas.destroy();
                charts.promessas = new Chart(document.getElementById('chartPromessas'), {
                    type: 'bar',
                    data: {
                        labels: Object.keys(groupedOps).map(l => l.substring(0, 25)),
                        datasets: [{ label: 'Promessas', data: Object.values(groupedOps).map(d => d.promessa), backgroundColor: '#10b981', borderRadius: 4 }]
                    },
                    options: {
                        indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { grid: { display: false } } }
                    }
                });
            }


            if (activePanelId === 'faturamento') {
                let filteredMeta = unifiedMeta.filter(d => {
                    if (!selEq.some(eq => opMatches(d.operacao, eq))) return false;
                    if (!selMes.includes(d.mes)) return false;
                    if (!selAno.includes(d.ano.toString())) return false;
                    return true;
                });

                const mesesOrdemMap = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
                const aggMetaTime = {};
                filteredMeta.forEach(d => {
                    const k = `${d.mes} ${d.ano}`;
                    const mIdx = mesesOrdemMap.indexOf(d.mes);
                    if(!aggMetaTime[k]) aggMetaTime[k] = { arrecadado: 0, meta: 0, sortIdx: d.ano * 100 + (mIdx >= 0 ? mIdx : 99) };
                    aggMetaTime[k].arrecadado += (d.arrecadado || 0);
                    aggMetaTime[k].meta += (d.meta || 0);
                });

                const labelsMeta = Object.keys(aggMetaTime).sort((a,b) => aggMetaTime[a].sortIdx - aggMetaTime[b].sortIdx);

                const totalArrecadado = labelsMeta.reduce((s, l) => s + aggMetaTime[l].arrecadado, 0);
                const totalMeta = labelsMeta.reduce((s, l) => s + aggMetaTime[l].meta, 0);
                const pctAlcance = totalMeta > 0 ? (totalArrecadado / totalMeta) : 0;

                const filtersBar = document.getElementById('filters-faturamento');
                if (filtersBar && !document.getElementById('kpiFatMeta')) {
                    const kpiDiv = document.createElement('div');
                    kpiDiv.id = 'kpiFatMeta';
                    kpiDiv.className = 'kpi-row';
                    kpiDiv.style.marginTop = '20px';
                    filtersBar.insertAdjacentElement('afterend', kpiDiv);
                }
                const kpiFatMeta = document.getElementById('kpiFatMeta');
                if (kpiFatMeta) {
                    kpiFatMeta.innerHTML = `
                        <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-value">${formatBRL(totalArrecadado)}</div><div class="kpi-label">Arrecadado Total</div></div>
                        <div class="kpi-card amber"><div class="kpi-icon"><i class="fas fa-bullseye"></i></div><div class="kpi-value">${formatBRL(totalMeta)}</div><div class="kpi-label">Meta Total</div></div>
                        <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-percentage"></i></div><div class="kpi-value">${formatPct(pctAlcance)}</div><div class="kpi-label">% Atingimento</div></div>
                    `;
                }

                if(charts.metaArr) charts.metaArr.destroy();
                charts.metaArr = new Chart(document.getElementById('chartMetaVsArr'), {
                    type: 'bar',
                    data: {
                        labels: labelsMeta,
                        datasets: [
                            { label: 'Arrecadado', data: labelsMeta.map(l => aggMetaTime[l].arrecadado), backgroundColor: '#8b5cf6', borderRadius: 4, yAxisID: 'y' },
                            { label: 'Meta', type: 'line', data: labelsMeta.map(l => aggMetaTime[l].meta), borderColor: '#f59e0b', borderDash: [5,5], borderWidth: 2, fill: false, yAxisID: 'y' },
                            { 
                                label: '% Atingimento', type: 'line', 
                                data: labelsMeta.map(l => aggMetaTime[l].meta > 0 ? (aggMetaTime[l].arrecadado / aggMetaTime[l].meta) * 100 : 0), 
                                borderColor: '#10b981', borderWidth: 2, pointRadius: 4, fill: false, yAxisID: 'y1' 
                            }
                        ]
                    },
                    options: { 
                        plugins: { 
                            datalabels: { 
                                align: 'top', anchor: 'end', 
                                display: (ctx) => ctx.datasetIndex !== 1, 
                                formatter: (v, ctx) => ctx.datasetIndex === 2 ? v.toFixed(1) + '%' : formatBRL(v) 
                            } 
                        },
                        scales: {
                            y: { position: 'left', ticks: { callback: v => formatBRL(v) } },
                            y1: { position: 'right', min: 0, max: 150, grid: { display: false }, ticks: { callback: v => v + '%' } }
                        }
                    }
                });

                if(charts.evolMeta) charts.evolMeta.destroy();
                charts.evolMeta = new Chart(document.getElementById('chartEvolMeta'), {
                    type: 'line',
                    data: {
                        labels: labelsMeta,
                        datasets: [{
                            label: '% Alcance da Meta',
                            data: labelsMeta.map(l => aggMetaTime[l].meta > 0 ? (aggMetaTime[l].arrecadado / aggMetaTime[l].meta) * 100 : 0),
                            borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', fill: true, tension: 0.3
                        }]
                    },
                    options: { scales: { y: { ticks: { callback: v => v + "%" } } }, plugins: { datalabels: { formatter: v => v.toFixed(1) + '%' } } }
                });
            }

            if (activePanelId === 'comparativo') {
                const mesesOrdemMap = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
                const compDataByYear = { '2024': {}, '2025': {}, '2026': {} };
                const compLabelsSet = new Set();
                unifiedMeta.forEach(d => {
                    if (!selEq.some(eq => opMatches(d.operacao, eq))) return;
                    if (!selMes.includes(d.mes)) return;
                    // Ignoring year filter specifically for this view so we can compare across years
                    if (compDataByYear[d.ano]) {
                        if(!compDataByYear[d.ano][d.mes]) compDataByYear[d.ano][d.mes] = { arrecadado: 0, meta: 0 };
                        compDataByYear[d.ano][d.mes].arrecadado += d.arrecadado || 0;
                        compDataByYear[d.ano][d.mes].meta += d.meta || 0;
                        compLabelsSet.add(d.mes);
                    }
                });
                const compLabelsSorted = [...compLabelsSet].sort((a,b) => mesesOrdemMap.indexOf(a) - mesesOrdemMap.indexOf(b));

                if(charts.compAnos) charts.compAnos.destroy();
                charts.compAnos = new Chart(document.getElementById('chartCompAnos'), {
                    type: 'bar',
                    data: {
                        labels: compLabelsSorted,
                        datasets: [
                            { label: '2024', data: compLabelsSorted.map(l => compDataByYear['2024'][l]?.arrecadado || 0), backgroundColor: '#f43f5e' },
                            { label: '2025', data: compLabelsSorted.map(l => compDataByYear['2025'][l]?.arrecadado || 0), backgroundColor: '#3b82f6' },
                            { label: '2026', data: compLabelsSorted.map(l => compDataByYear['2026'][l]?.arrecadado || 0), backgroundColor: '#10b981' }
                        ]
                    }
                });

                if(charts.alcanceComp) charts.alcanceComp.destroy();
                charts.alcanceComp = new Chart(document.getElementById('chartAlcanceComp'), {
                    type: 'line',
                    data: {
                        labels: compLabelsSorted,
                        datasets: [
                            { label: '2024', data: compLabelsSorted.map(l => (compDataByYear['2024'][l] && compDataByYear['2024'][l].meta > 0) ? (compDataByYear['2024'][l].arrecadado / compDataByYear['2024'][l].meta) * 100 : 0), borderColor: '#f43f5e', tension: 0.3 },
                            { label: '2025', data: compLabelsSorted.map(l => (compDataByYear['2025'][l] && compDataByYear['2025'][l].meta > 0) ? (compDataByYear['2025'][l].arrecadado / compDataByYear['2025'][l].meta) * 100 : 0), borderColor: '#3b82f6', tension: 0.3 },
                            { label: '2026', data: compLabelsSorted.map(l => (compDataByYear['2026'][l] && compDataByYear['2026'][l].meta > 0) ? (compDataByYear['2026'][l].arrecadado / compDataByYear['2026'][l].meta) * 100 : 0), borderColor: '#10b981', tension: 0.3 }
                        ]
                    },
                    options: { 
                        layout: { padding: { top: 30, bottom: 10 } },
                        plugins: { 
                            legend: { position: 'bottom', labels: { padding: 20 } },
                            datalabels: { 
                                align: 'top', 
                                anchor: 'end', 
                                offset: 2,
                                formatter: v => v > 0 ? v.toFixed(0) + '%' : '',
                                font: { size: 9, weight: 'bold' }
                            } 
                        },
                        scales: {
                            y: { beginAtZero: true, max: 130, ticks: { callback: v => v + '%' } }
                        }
                    }
                });
            }

            if (activePanelId === 'operadores' || activePanelId === 'quartil') {
                let filteredOperators = operadores.filter(o => {
                    if (selEq.length > 0 && !selEq.some(eq => opMatches(o.operacao, eq) || opMatches(o.nova_lotacao, eq))) return false;
                    
                    const mNorm = o.mes;
                    const year = (o.ano || "").toString();
                    if (selAno.length > 0 && !selAno.includes(year)) return false;
                    if (selMes.length > 0 && !selMes.includes(mNorm)) return false;

                    const rawQHO = o.quartil_ho ? o.quartil_ho.toString() : '';
                    let qNumHO = rawQHO.includes('1') ? '1' : rawQHO.includes('2') ? '2' : rawQHO.includes('3') ? '3' : rawQHO.includes('4') ? '4' : '0';
                    if (selQuartilHO.length > 0 && selQuartilHO.length < 4 && !selQuartilHO.includes(qNumHO)) return false;

                    const rawQProm = o.quartil_prom ? o.quartil_prom.toString() : '';
                    let qNumProm = rawQProm.includes('1') ? '1' : rawQProm.includes('2') ? '2' : rawQProm.includes('3') ? '3' : rawQProm.includes('4') ? '4' : '0';
                    if (selQuartilProm.length > 0 && selQuartilProm.length < 4 && !selQuartilProm.includes(qNumProm)) return false;

                    return true;
                });

                // Text search
                const searchVal = document.getElementById('searchOperador') ? document.getElementById('searchOperador').value.toLowerCase() : '';
                if (searchVal) {
                    filteredOperators = filteredOperators.filter(o => o.agente && o.agente.toLowerCase().includes(searchVal));
                }

                if (activePanelId === 'operadores') {
                    const aggOps = {};
                    filteredOperators.forEach(op => {
                        // Create a unique key for EACH record (Agent + Month + Year) to prevent summation
                        const recordKey = `${op.agente}_${op.mes}_${op.ano}`;
                        if(!aggOps[recordKey]) {
                            aggOps[recordKey] = {
                                agente: op.agente, 
                                operacao: op.operacao,
                                matricula: op.matricula,
                                mes: op.mes,
                                ano: op.ano,
                                ho: op.ho || 0,
                                alcance_ho: op.alcance_ho || 0,
                                dispersao: op.dispersao,
                                cpc: op.cpc || 0,
                                promessa: op.promessa || 0,
                                qualidade: op.qualidade,
                                abs: op.abs,
                                pausa_100: op.pausa_100,
                                tempo_logado: op.tempo_logado,
                                quartil_ho: op.quartil_ho
                            };
                        }
                    });

                    // Update aggOps to use the correct operation name if matched via nova_lotacao
                    Object.values(aggOps).forEach(op => {
                        if (selEq.length > 0 && !selEq.some(eq => opMatches(op.operacao, eq))) {
                            const match = selEq.find(eq => {
                                return filteredOperators.some(o => o.agente === op.agente && opMatches(o.nova_lotacao, eq));
                            });
                            if (match) op.operacao = match;
                        }
                    });

                    const opGrid = document.getElementById('operatorsGrid');
                    if (opGrid) {
                        opGrid.innerHTML = '';
                        Object.values(aggOps).sort((a,b) => b.ho - a.ho).slice(0, 300).forEach(op => {
                            const qNum = op.quartil_ho ? (op.quartil_ho.includes('1') ? '1' : op.quartil_ho.includes('2') ? '2' : op.quartil_ho.includes('3') ? '3' : op.quartil_ho.includes('4') ? '4' : '0') : '0';
                            const badgeCls = `badge-${qNum}q`;
                            const displayQ = qNum !== '0' ? `${qNum}º Q` : '-';
                            
                             opGrid.innerHTML += `
                                 <div class="op-card">
                                     <div class="op-quartil-badge ${badgeCls}">${displayQ}</div>
                                     <div class="op-header">
                                         <div class="op-avatar" style="background: var(--bg-secondary); border: 1px solid var(--border);">${op.agente ? op.agente.charAt(0) : 'U'}</div>
                                         <div>
                                            <div class="op-name">${op.agente}</div>
                                            <div class="op-team" style="font-size:0.7rem;opacity:0.8;">
                                                <span style="color:var(--accent-blue)">${op.mes.toUpperCase()} ${op.ano}</span> | MAT: ${op.matricula || '-'}
                                            </div>
                                         </div>
                                     </div>
                                     <div class="op-metrics">
                                         <div class="op-metric"><div class="metric-value">${formatBRL(op.ho)}</div><div class="metric-label">H.O</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(op.alcance_ho)}</div><div class="metric-label">Alcance H.O</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(op.qualidade)}</div><div class="metric-label">Qualidade</div></div>
                                         <div class="op-metric"><div class="metric-value" style="color:var(--accent-amber); font-weight:bold;">${formatNum(op.abs)}</div><div class="metric-label">ABS</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(op.pausa_100)}</div><div class="metric-label">% Pausa</div></div>
                                         <div class="op-metric"><div class="metric-value">${op.tempo_logado ? op.tempo_logado.substring(0, 5) : '-'}</div><div class="metric-label">T. Logado</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatNum(op.promessa)}</div><div class="metric-label">Promessas</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(op.dispersao)}</div><div class="metric-label">Dispersão</div></div>
                                     </div>
                                 </div>
                             `;
                        });
                    }
                }

                if (activePanelId === 'quartil') {
                    const q1Stats = {};
                    const q2Stats = {};
                    const q3Stats = {};
                    const q4Stats = {};
                    const distCount = {'1º Quartil': 0, '2º Quartil': 0, '3º Quartil': 0, '4º Quartil': 0};

                    filteredOperators.forEach(op => {
                        const rawQ = op.quartil_ho ? op.quartil_ho.toString() : '';
                        const mesStr = op.mes ? normalizeMonth(op.mes) : '?';
                        
                        if(rawQ.includes('1')) {
                            distCount['1º Quartil']++;
                            if(!q1Stats[op.agente]) q1Stats[op.agente] = {count: 0, meses: []};
                            q1Stats[op.agente].count++;
                            if(!q1Stats[op.agente].meses.includes(mesStr)) q1Stats[op.agente].meses.push(mesStr);
                        }
                        else if(rawQ.includes('2')) {
                            distCount['2º Quartil']++;
                            if(!q2Stats[op.agente]) q2Stats[op.agente] = {count: 0, meses: []};
                            q2Stats[op.agente].count++;
                            if(!q2Stats[op.agente].meses.includes(mesStr)) q2Stats[op.agente].meses.push(mesStr);
                        }
                        else if(rawQ.includes('3')) {
                            distCount['3º Quartil']++;
                            if(!q3Stats[op.agente]) q3Stats[op.agente] = {count: 0, meses: []};
                            q3Stats[op.agente].count++;
                            if(!q3Stats[op.agente].meses.includes(mesStr)) q3Stats[op.agente].meses.push(mesStr);
                        }
                        else if(rawQ.includes('4')) {
                            distCount['4º Quartil']++;
                            if(!q4Stats[op.agente]) q4Stats[op.agente] = {count: 0, meses: []};
                            q4Stats[op.agente].count++;
                            if(!q4Stats[op.agente].meses.includes(mesStr)) q4Stats[op.agente].meses.push(mesStr);
                        }
                    });

                    const renderQCards = (statsMap, containerId, iconClass, colorClass) => {
                        const arr = Object.entries(statsMap).sort((a,b) => b[1].count - a[1].count).slice(0, 12);
                        const container = document.getElementById(containerId);
                        if (!container) return;
                        container.innerHTML = '';
                        if(arr.length === 0) container.innerHTML = '<div style="color:var(--text-secondary); padding: 20px;">Nenhum operador registrado.</div>';
                        
                        let colorHex = 'var(--text-primary)';
                        if (colorClass === 'badge-1q') colorHex = 'var(--accent-emerald)';
                        if (colorClass === 'badge-2q') colorHex = 'var(--accent-blue)';
                        if (colorClass === 'badge-3q') colorHex = 'var(--accent-amber)';
                        if (colorClass === 'badge-4q') colorHex = 'var(--accent-rose)';

                        arr.forEach((item, idx) => {
                            container.innerHTML += `
                                <div class="q-card ${idx < 3 ? 'highlight' : ''}" style="${idx < 3 && colorClass === 'badge-1q' ? 'border-color: rgba(16,185,129,0.3); animation: pulse-glow-green 2s infinite;' : ''}">
                                    <div class="q-rank" style="background: var(--bg-secondary); border: 1px solid var(--border);">#${idx+1}</div>
                                    <div class="q-info">
                                        <div class="q-name">${item[0]}</div>
                                        <div class="q-count" style="color: ${colorHex}"><i class="${iconClass}"></i> ${item[1].count} vezes</div>
                                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;"><strong>Meses:</strong> ${item[1].meses.join(', ')}</div>
                                    </div>
                                </div>
                            `;
                        });
                    };

                    renderQCards(q1Stats, 'quartil1Cards', 'fas fa-star', 'badge-1q');
                    renderQCards(q2Stats, 'quartil2Cards', 'fas fa-medal', 'badge-2q');
                    renderQCards(q3Stats, 'quartil3Cards', 'fas fa-award', 'badge-3q');
                    renderQCards(q4Stats, 'quartil4Cards', 'fas fa-exclamation-triangle', 'badge-4q');

                    if(charts.quartilDist) charts.quartilDist.destroy();
                    const ctxDist = document.getElementById('chartQuartilDist');
                    if (ctxDist) {
                        charts.quartilDist = new Chart(ctxDist, {
                            type: 'bar',
                            data: {
                                labels: Object.keys(distCount),
                                datasets: [{ label: 'Qtd Registros', data: Object.values(distCount), backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e'], borderRadius: 4 }]
                            }
                        });
                    }
                }
            }
        }

        setTimeout(() => {
            ['overview', 'faturamento', 'comparativo', 'operadores', 'quartil'].forEach(p => updateTeamFilter(p));
            renderCharts();
        }, 300);
    };

    // --- AUTH LOGIC ---
    const btn = document.getElementById('loginBtn');
    const input = document.getElementById('loginInput');
    const err = document.getElementById('loginError');

    const attemptLogin = () => {
        if (input.value.trim() === '1926') {
            err.style.display = 'none';
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContent').style.display = 'flex';
            initApp();
        } else {
            err.style.display = 'block';
            input.value = '';
            input.focus();
        }
    };

    btn.addEventListener('click', attemptLogin);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

});
