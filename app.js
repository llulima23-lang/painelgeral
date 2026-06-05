document.addEventListener('DOMContentLoaded', () => {

    const initApp = () => {
        let charts = {};

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

        const opMatches = (val1, val2) => {
            if (!val1 || !val2) return false;
            const s1 = val1.toLowerCase().replace(/[^a-z0-9]/g, '');
            const s2 = val2.toLowerCase().replace(/[^a-z0-9]/g, '');
            return s1 === s2 || s1.includes(s2) || s2.includes(s1);
        };

        const { operadores, meta2025, meta2024, meta_cnu, producao_operacoes, fechamentos2026, abs_geral_timeline, alares, agoracred } = DASHBOARD_DATA;
        const alaresData = alares || [];
        const agoracredData = agoracred || [];
        const absData = DASHBOARD_DATA.abs_data || {};
        const absGeralTimeline = abs_geral_timeline || [];

        const normalizeMonth = (m) => {
            if (!m) return '';
            let monthIdx = -1;
            if (typeof m === 'string' && m.includes('-')) {
                const parts = m.split('-');
                if (parts.length >= 2) monthIdx = parseInt(parts[1]) - 1;
            }
            const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            if (monthIdx >= 0 && monthIdx < 12) return months[monthIdx];

            const date = new Date(m);
            if (isNaN(date)) return m.toString().toLowerCase().replace('ç', 'c').replace('ã', 'a').replace('á', 'a').replace('é', 'e').replace('ê', 'e').replace('í', 'i').replace('ó', 'o').replace('ô', 'o').replace('ú', 'u');
            return months[date.getUTCMonth()];
        };

        // ── Normalize month to accent-free lowercase (used consistently everywhere)
        const MONTHS_NORM = {
            'JANEIRO': 'janeiro', 'FEVEREIRO': 'fevereiro', 'MARCO': 'marco', 'MARCO': 'marco',
            'ABRIL': 'abril', 'MAIO': 'maio', 'JUNHO': 'junho', 'JULHO': 'julho',
            'AGOSTO': 'agosto', 'SETEMBRO': 'setembro', 'OUTUBRO': 'outubro',
            'NOVEMBRO': 'novembro', 'DEZEMBRO': 'dezembro',
            'JAN': 'janeiro', 'FEV': 'fevereiro', 'MAR': 'marco', 'ABR': 'abril',
            'MAI': 'maio', 'JUN': 'junho', 'JUL': 'julho', 'AGO': 'agosto',
            'SET': 'setembro', 'OUT': 'outubro', 'NOV': 'novembro', 'DEZ': 'dezembro'
        };
        const stripAccents = (s) => s ? s.toString()
            .replace(/[çÇ]/g, 'c').replace(/[ãÃáÁâÂàÀ]/g, 'a')
            .replace(/[éÉêÊ]/g, 'e').replace(/[íÍ]/g, 'i')
            .replace(/[óÓôÔ]/g, 'o').replace(/[úÚ]/g, 'u') : '';
        const monthNameToNorm = (s) => {
            if (!s) return '';
            const up = stripAccents(s.toString().toUpperCase().trim());
            if (MONTHS_NORM[up]) return MONTHS_NORM[up];
            for (const [k, v] of Object.entries(MONTHS_NORM)) {
                if (up.startsWith(stripAccents(k))) return v;
            }
            return stripAccents(s.toString().toLowerCase());
        };

        const timeToSec = (t) => {
            if (typeof t === 'number') return Math.round(t * 3600);
            if (!t || typeof t !== 'string') return 0;
            const p = t.split(':');
            if (p.length === 3) return parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(p[2]);
            return 0;
        };
        const secToTime = (s) => {
            if (!s) return '-';
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
            arr.forEach(d => { if (d.operacao) s.add(d.operacao); });
            return [...s].sort();
        };

        const eqProd = getTeams(producao_operacoes);
        const eqMeta = getTeams(unifiedMeta);
        const eqOper = getTeams(operadores);

        // Month display names (accented for UI) mapped to normalized accent-free values
        const mesesOrdemOriginal = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
        const mesesNormValues = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

        // HTML generator for filters
        const buildFiltersHTML = (panelId, teams, showQuartil = false, hideTeam = false) => {
            let teamsHTML = teams.map(t => `<label><input type="checkbox" value="${t}" class="opt-cb" checked> ${t}</label>`).join('');
            let mesesHTML = mesesOrdemOriginal.map((m, i) => `<label><input type="checkbox" value="${mesesNormValues[i]}" class="opt-cb" checked> ${m}</label>`).join('');
            let anosHTML = [2024, 2025, 2026].map(a => `<label><input type="checkbox" value="${a}" class="opt-cb" checked> ${a}</label>`).join('');

            let html = `
                <div class="filter-group" style="${hideTeam ? 'display:none' : ''}">
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
                        <div class="select-box"><span>Todos</span> <i class="fas fa-chevron-down"></i></div>
                        <div class="options-container">
                            <label><input type="checkbox" value="ALL" class="selectAll" checked> (Selecionar Todos)</label>
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
        buildFiltersHTML('dispersao', eqProd);

        buildFiltersHTML('alares', [], false, true);
        buildFiltersHTML('agoracred', [], false, true);

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

                selectAll.checked = cbs.every(c => c.checked);
                updateText();

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
                        if (other !== el) other.classList.remove('active');
                    });
                    el.classList.toggle('active');
                    e.stopPropagation();
                });

                const optionsContainer = el.querySelector('.options-container');
                if (optionsContainer) optionsContainer.addEventListener('click', e => e.stopPropagation());
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

        const getSelected = (panelId, selClass) => {
            const panel = document.getElementById(`panel-${panelId}`);
            if (!panel) return [];
            return Array.from(panel.querySelectorAll(`.${selClass} .opt-cb:checked`)).map(cb => cb.value);
        };

        initSelects();

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('active'));
        });

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

        if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

        const logoArea = document.querySelector('.logo-area');
        if (logoArea) {
            logoArea.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }

        // Search Input binding
        const searchInput = document.getElementById('searchOperador');
        if (searchInput) searchInput.addEventListener('input', renderCharts);

        // Chart.js defaults
        // Chart.register(ChartDataLabels);
        Chart.defaults.color = '#5A7A65';
        Chart.defaults.font.family = 'Inter';
        Chart.defaults.plugins.tooltip.backgroundColor = '#1A3326';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(27,94,56,0.1)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.scale.grid.color = 'rgba(27,94,56,0.05)';
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.plugins.datalabels = { display: false };



        function renderCharts() {
            const activePanelId = document.querySelector('.panel.active').id.replace('panel-', '');

            const selEq = getSelected(activePanelId, 'dd-equipe');
            const selMes = getSelected(activePanelId, 'dd-mes');
            const selAno = getSelected(activePanelId, 'dd-ano');
            const selQuartilHO = getSelected(activePanelId, 'dd-quartil-ho');
            const selQuartilProm = getSelected(activePanelId, 'dd-quartil-prom');

            console.log('DEBUG renderCharts:', activePanelId, JSON.stringify({ selEq: selEq.length, selMes: selMes.length, selAno: selAno.length }));

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
                    g.promessa += (!isNaN(Number(d.promessa)) && d.promessa != null) ? Number(d.promessa) : 0;
                    g.cpc += (!isNaN(Number(d.cpc)) && d.cpc != null) ? Number(d.cpc) : 0;

                    // Qualidade, Pausa are percentages -> Average them
                    if (d.qualidade !== null && d.qualidade !== undefined && !isNaN(d.qualidade)) {
                        g.qSum += Number(d.qualidade); g.qCount++;
                    }
                    if (d.pct_pausa !== null && d.pct_pausa !== undefined && !isNaN(d.pct_pausa)) {
                        g.pSum += Number(d.pct_pausa); g.pCount++;
                    }
                });

                // ─── Build list of keys (unused for ABS now, but keeping month order logic if needed)
                const totalHO = Object.values(groupedOps).reduce((s, a) => s + a.ho, 0);
                const totalCPC = Object.values(groupedOps).reduce((s, a) => s + a.cpc, 0);
                const totalProm = Object.values(groupedOps).reduce((s, a) => s + a.promessa, 0);

                const withQ = Object.values(groupedOps).filter(m => m.qCount > 0);
                const withP = Object.values(groupedOps).filter(m => m.pCount > 0);
                const avgQual = withQ.length > 0 ? withQ.reduce((s, m) => s + m.qSum / m.qCount, 0) / withQ.length : 0;
                const avgPausa = withP.length > 0 ? withP.reduce((s, m) => s + m.pSum / m.pCount, 0) / withP.length : 0;

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
                Object.keys(groupedOps).sort((a, b) => groupedOps[b].ho - groupedOps[a].ho).forEach((team, i) => {
                    const c = colors[i % colors.length];
                    const g = groupedOps[team];
                    const qual = g.qCount > 0 ? g.qSum / g.qCount : 0;
                    const pau = g.pCount > 0 ? g.pSum / g.pCount : 0;
                    teamCardsContainer.innerHTML += `
                        <div class="kpi-card ${c}">
                            <div class="kpi-label" style="font-size:0.85rem;color:var(--text-primary);margin-bottom:10px;font-weight:700;">${team.substring(0, 35)}</div>
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
                    const mIdx = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].indexOf(mNorm);
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

                const labelsTime = Object.keys(timeSeries).sort((a, b) => timeSeries[a].sortVal - timeSeries[b].sortVal);
                const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

                console.log('DEBUG labelsTime:', labelsTime.length, 'groupedOps:', Object.keys(groupedOps).length);

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

                const mesesOrdemMap = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                const aggMetaTime = {};
                filteredMeta.forEach(d => {
                    const k = `${d.mes} ${d.ano}`;
                    const mIdx = mesesOrdemMap.indexOf(d.mes);
                    if (!aggMetaTime[k]) aggMetaTime[k] = { arrecadado: 0, meta: 0, sortIdx: d.ano * 100 + (mIdx >= 0 ? mIdx : 99) };
                    aggMetaTime[k].arrecadado += (d.arrecadado || 0);
                    aggMetaTime[k].meta += (d.meta || 0);
                });

                const labelsMeta = Object.keys(aggMetaTime).sort((a, b) => aggMetaTime[a].sortIdx - aggMetaTime[b].sortIdx);

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

                if (charts.metaArr) charts.metaArr.destroy();
                charts.metaArr = new Chart(document.getElementById('chartMetaVsArr'), {
                    type: 'bar',
                    plugins: [ChartDataLabels],
                    data: {
                        labels: labelsMeta,
                        datasets: [
                            { label: 'Arrecadado', data: labelsMeta.map(l => aggMetaTime[l].arrecadado), backgroundColor: '#8b5cf6', borderRadius: 4, yAxisID: 'y' },
                            { label: 'Meta', type: 'line', data: labelsMeta.map(l => aggMetaTime[l].meta), borderColor: '#f59e0b', borderDash: [5, 5], borderWidth: 2, fill: false, yAxisID: 'y' },
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
                                color: (ctx) => ctx.datasetIndex === 2 ? '#10b981' : '#8b5cf6',
                                font: { weight: 'bold', size: 10, family: "'Inter', sans-serif" },
                                formatter: (v, ctx) => ctx.datasetIndex === 2 ? v.toFixed(1) + '%' : formatBRL(v)
                            }
                        },
                        layout: { padding: { top: 30 } },
                        scales: {
                            y: { position: 'left', grace: '15%', ticks: { callback: v => formatBRL(v), font: { family: "'Inter', sans-serif" } } },
                            y1: { position: 'right', min: 0, grace: '25%', grid: { display: false }, ticks: { callback: v => v + '%', font: { family: "'Inter', sans-serif" } } }
                        }
                    }
                });

                if (charts.evolMeta) charts.evolMeta.destroy();
                charts.evolMeta = new Chart(document.getElementById('chartEvolMeta'), {
                    type: 'line',
                    plugins: [ChartDataLabels],
                    data: {
                        labels: labelsMeta,
                        datasets: [{
                            label: '% Alcance da Meta',
                            data: labelsMeta.map(l => aggMetaTime[l].meta > 0 ? (aggMetaTime[l].arrecadado / aggMetaTime[l].meta) * 100 : 0),
                            borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', fill: true, tension: 0.3
                        }]
                    },
                    options: { 
                        layout: { padding: { top: 30 } },
                        scales: { y: { grace: '20%', ticks: { callback: v => v + "%", font: { family: "'Inter', sans-serif" } } } }, 
                        plugins: { datalabels: { align: 'top', anchor: 'end', color: '#06b6d4', font: { weight: 'bold', size: 10, family: "'Inter', sans-serif" }, formatter: v => v.toFixed(1) + '%' } } 
                    }
                });
            }

            if (activePanelId === 'comparativo') {
                const mesesOrdemMap = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                const compDataByYear = { '2024': {}, '2025': {}, '2026': {} };
                const compLabelsSet = new Set();
                unifiedMeta.forEach(d => {
                    if (!selEq.some(eq => opMatches(d.operacao, eq))) return;
                    if (!selMes.includes(d.mes)) return;
                    if (!selAno.includes(d.ano.toString())) return; // Respeitando o filtro de ano
                    
                    if (compDataByYear[d.ano]) {
                        if (!compDataByYear[d.ano][d.mes]) compDataByYear[d.ano][d.mes] = { arrecadado: 0, meta: 0 };
                        compDataByYear[d.ano][d.mes].arrecadado += d.arrecadado || 0;
                        compDataByYear[d.ano][d.mes].meta += d.meta || 0;
                        compLabelsSet.add(d.mes);
                    }
                });
                const compLabelsSorted = [...compLabelsSet].sort((a, b) => mesesOrdemMap.indexOf(a) - mesesOrdemMap.indexOf(b));

                if (charts.compAnos) charts.compAnos.destroy();
                charts.compAnos = new Chart(document.getElementById('chartCompAnos'), {
                    type: 'bar',
                    data: {
                        labels: compLabelsSorted,
                        datasets: [
                            { label: '2024', data: compLabelsSorted.map(l => compDataByYear['2024'][l]?.arrecadado || 0), backgroundColor: '#1B5E38', borderColor: '#1B5E38', borderWidth: 1, borderRadius: 4, maxBarThickness: 40 },
                            { label: '2025', data: compLabelsSorted.map(l => compDataByYear['2025'][l]?.arrecadado || 0), backgroundColor: '#2E7D4F', borderColor: '#2E7D4F', borderWidth: 1, borderRadius: 4, maxBarThickness: 40 },
                            { label: '2026', data: compLabelsSorted.map(l => compDataByYear['2026'][l]?.arrecadado || 0), backgroundColor: '#5FAD41', borderColor: '#5FAD41', borderRadius: 4, maxBarThickness: 40 }
                        ].filter(ds => selAno.includes(ds.label))
                    },
                    options: {
                        layout: { padding: { top: 20 } },
                        plugins: {
                            legend: { position: 'bottom', labels: { padding: 20, font: { family: "'Inter', sans-serif", size: 13 } } },
                            tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.85)',
                                titleFont: { size: 14, family: "'Inter', sans-serif" },
                                bodyFont: { size: 13, family: "'Inter', sans-serif" },
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) label += ': ';
                                        if (context.parsed.y !== null) {
                                            label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                        }
                                        return label;
                                    }
                                }
                            },
                            datalabels: { display: false }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" } } },
                            y: { 
                                beginAtZero: true, 
                                grace: '10%',
                                grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                                ticks: {
                                    font: { family: "'Inter', sans-serif" },
                                    callback: function(value) {
                                        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(value);
                                    }
                                }
                            }
                        }
                    }
                });

                if (charts.alcanceComp) charts.alcanceComp.destroy();
                charts.alcanceComp = new Chart(document.getElementById('chartAlcanceComp'), {
                    type: 'line',
                    plugins: [ChartDataLabels],
                    data: {
                        labels: compLabelsSorted,
                        datasets: [
                            { label: '2024', data: compLabelsSorted.map(l => (compDataByYear['2024'][l] && compDataByYear['2024'][l].meta > 0) ? (compDataByYear['2024'][l].arrecadado / compDataByYear['2024'][l].meta) * 100 : 0), borderColor: '#1B5E38', backgroundColor: '#1B5E38', tension: 0.4, borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#fff', pointBorderColor: '#1B5E38', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6 },
                            { label: '2025', data: compLabelsSorted.map(l => (compDataByYear['2025'][l] && compDataByYear['2025'][l].meta > 0) ? (compDataByYear['2025'][l].arrecadado / compDataByYear['2025'][l].meta) * 100 : 0), borderColor: '#2E7D4F', backgroundColor: '#2E7D4F', tension: 0.4, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#2E7D4F', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6 },
                            { label: '2026', data: compLabelsSorted.map(l => (compDataByYear['2026'][l] && compDataByYear['2026'][l].meta > 0) ? (compDataByYear['2026'][l].arrecadado / compDataByYear['2026'][l].meta) * 100 : 0), borderColor: '#8DC642', backgroundColor: 'rgba(141, 198, 66, 0.1)', fill: true, tension: 0.4, borderWidth: 4, pointBackgroundColor: '#8DC642', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 6, pointHoverRadius: 8 }
                        ].filter(ds => selAno.includes(ds.label))
                    },
                    options: {
                        layout: { padding: { top: 40, bottom: 10 } },
                        plugins: {
                            legend: { position: 'bottom', labels: { padding: 20, font: { family: "'Inter', sans-serif", size: 13 } } },
                            tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.85)',
                                titleFont: { size: 14, family: "'Inter', sans-serif" },
                                bodyFont: { size: 13, family: "'Inter', sans-serif" },
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                                    }
                                }
                            },
                            datalabels: {
                                align: (ctx) => {
                                    if (ctx.datasetIndex === 0) return 'bottom';
                                    if (ctx.datasetIndex === 1) return 'top';
                                    return 'end';
                                },
                                anchor: (ctx) => {
                                    if (ctx.datasetIndex === 0) return 'start';
                                    if (ctx.datasetIndex === 1) return 'end';
                                    return 'center';
                                },
                                offset: 4,
                                backgroundColor: 'rgba(255,255,255,0.7)',
                                borderRadius: 4,
                                color: function(context) {
                                    return context.dataset.borderColor;
                                },
                                formatter: v => v > 0 ? v.toFixed(0) + '%' : '',
                                font: { size: 10, weight: 'bold', family: "'Inter', sans-serif" }
                            }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" } } },
                            y: { 
                                beginAtZero: true, 
                                grace: '25%', 
                                grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                                ticks: { callback: v => v + '%', font: { family: "'Inter', sans-serif" } }
                            }
                        }
                    }
                });
            }

            if (activePanelId === 'operadores' || activePanelId === 'quartil') {
                // Pre-calculate dynamic promessa quartiles per row
                const getPromVal = v => (v != null && !isNaN(Number(v))) ? Number(v) : 0;
                const sortedByProm = [...operadores].sort((a,b) => getPromVal(b.promessa) - getPromVal(a.promessa));
                sortedByProm.forEach((op, idx) => {
                    const pct = idx / sortedByProm.length;
                    if (pct <= 0.25) op.quartil_prom_dyn = '1';
                    else if (pct <= 0.50) op.quartil_prom_dyn = '2';
                    else if (pct <= 0.75) op.quartil_prom_dyn = '3';
                    else op.quartil_prom_dyn = '4';
                });

                let filteredOperators = operadores.filter(o => {
                    if (selEq.length > 0 && !selEq.some(eq => opMatches(o.operacao, eq) || opMatches(o.nova_lotacao, eq))) return false;

                    const mNorm = o.mes;
                    const year = (o.ano || "").toString();
                    if (selAno.length > 0 && !selAno.includes(year)) return false;
                    if (selMes.length > 0 && !selMes.includes(mNorm)) return false;

                    const rawQHO = o.quartil_ho ? o.quartil_ho.toString() : '';
                    let qNumHO = rawQHO.includes('1') ? '1' : rawQHO.includes('2') ? '2' : rawQHO.includes('3') ? '3' : rawQHO.includes('4') ? '4' : '0';
                    if (selQuartilHO.length > 0 && selQuartilHO.length < 4 && !selQuartilHO.includes(qNumHO)) return false;

                    const rawQProm = o.quartil_prom ? o.quartil_prom.toString() : (o.quartil_prom_dyn || '');
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
                        const recordKey = op.agente;
                        if (!aggOps[recordKey]) {
                            aggOps[recordKey] = {
                                agente: op.agente,
                                operacao: op.operacao,
                                matricula: op.matricula,
                                ho: 0,
                                cpc: 0,
                                promessa: 0,
                                abs: 0,
                                tempo_logado_sec: 0,
                                sum_alcance_ho: 0, count_alcance_ho: 0,
                                sum_dispersao: 0, count_dispersao: 0,
                                sum_qualidade: 0, count_qualidade: 0,
                                sum_pausa: 0, count_pausa: 0,
                                quartil_ho: op.quartil_ho,
                                meses: new Set()
                            };
                        }
                        
                        const agg = aggOps[recordKey];
                        if (op.mes) agg.meses.add(`${op.mes.toUpperCase()} ${op.ano}`);
                        
                        agg.ho += Number(op.ho || 0);
                        agg.promessa += (Number(op.promessa) || 0);
                        agg.abs += (Number(op.abs) || 0);
                        agg.tempo_logado_sec += timeToSec(op.tempo_logado);
                        
                        if (op.alcance_ho != null && !isNaN(Number(op.alcance_ho))) { agg.sum_alcance_ho += Number(op.alcance_ho); agg.count_alcance_ho++; }
                        if (op.dispersao != null && !isNaN(Number(op.dispersao))) { agg.sum_dispersao += Number(op.dispersao); agg.count_dispersao++; }
                        if (op.qualidade != null && !isNaN(Number(op.qualidade))) { agg.sum_qualidade += Number(op.qualidade); agg.count_qualidade++; }
                        if (op.pausa_100 != null && !isNaN(Number(op.pausa_100))) { agg.sum_pausa += Number(op.pausa_100); agg.count_pausa++; }
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
                        Object.values(aggOps).sort((a, b) => b.ho - a.ho).slice(0, 300).forEach(op => {
                            const qNum = op.quartil_ho ? (op.quartil_ho.includes('1') ? '1' : op.quartil_ho.includes('2') ? '2' : op.quartil_ho.includes('3') ? '3' : op.quartil_ho.includes('4') ? '4' : '0') : '0';
                            const badgeCls = `badge-${qNum}q`;
                            const displayQ = qNum !== '0' ? `${qNum}º Q` : '-';
                            
                            const avg_alcance = op.count_alcance_ho > 0 ? op.sum_alcance_ho / op.count_alcance_ho : 0;
                            const avg_dispersao = op.count_dispersao > 0 ? op.sum_dispersao / op.count_dispersao : 0;
                            const avg_qualidade = op.count_qualidade > 0 ? op.sum_qualidade / op.count_qualidade : 0;
                            const avg_pausa = op.count_pausa > 0 ? op.sum_pausa / op.count_pausa : 0;
                            const tempoLogadoStr = op.tempo_logado_sec > 0 ? secToTime(op.tempo_logado_sec) : '-';
                            const displayMeses = op.meses.size > 1 ? 'Múltiplos Meses' : (Array.from(op.meses)[0] || '');

                            opGrid.innerHTML += `
                                 <div class="op-card">
                                     <div class="op-quartil-badge ${badgeCls}">${displayQ}</div>
                                     <div class="op-header">
                                         <div class="op-avatar" style="background: var(--bg-secondary); border: 1px solid var(--border);">${op.agente ? op.agente.charAt(0) : 'U'}</div>
                                         <div>
                                            <div class="op-name">${op.agente}</div>
                                            <div class="op-team" style="font-size:0.85rem;opacity:0.8;">
                                                <span style="color:var(--accent-blue)">${displayMeses}</span> | MAT: ${op.matricula || '-'}
                                            </div>
                                         </div>
                                     </div>
                                     <div class="op-metrics">
                                         <div class="op-metric"><div class="metric-value">${formatBRL(op.ho)}</div><div class="metric-label">H.O Total</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(avg_alcance)}</div><div class="metric-label">Alcance Méd.</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(avg_qualidade)}</div><div class="metric-label">Qualid. Méd.</div></div>
                                         <div class="op-metric"><div class="metric-value" style="color:var(--accent-amber); font-weight:bold;">${formatNum(op.abs)}</div><div class="metric-label">Faltas (ABS)</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(avg_pausa)}</div><div class="metric-label">% Pausa Méd.</div></div>
                                         <div class="op-metric"><div class="metric-value">${tempoLogadoStr}</div><div class="metric-label">T. Logado</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatNum(op.promessa)}</div><div class="metric-label">Prom. Total</div></div>
                                         <div class="op-metric"><div class="metric-value">${formatPct(avg_dispersao)}</div><div class="metric-label">Disp. Méd.</div></div>
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
                    const distCount = { '1º Quartil': 0, '2º Quartil': 0, '3º Quartil': 0, '4º Quartil': 0 };

                    const useProm = selQuartilProm.length > 0 && selQuartilProm.length < 4;
                    filteredOperators.forEach(op => {
                        const rawQ = useProm 
                            ? (op.quartil_prom ? op.quartil_prom.toString() : (op.quartil_prom_dyn || ''))
                            : (op.quartil_ho ? op.quartil_ho.toString() : '');
                        const mesStr = op.mes ? normalizeMonth(op.mes) : '?';
                        const avgAlcance = op.alcance_ho != null && !isNaN(Number(op.alcance_ho)) ? Number(op.alcance_ho) : 0;
                        const promessa = op.promessa != null && !isNaN(Number(op.promessa)) ? Number(op.promessa) : 0;

                        const updateStats = (statsObj, agente) => {
                            if (!statsObj[agente]) statsObj[agente] = { count: 0, meses: [], sum_alcance: 0, sum_promessa: 0 };
                            statsObj[agente].count++;
                            if (!statsObj[agente].meses.includes(mesStr)) statsObj[agente].meses.push(mesStr);
                            statsObj[agente].sum_alcance += avgAlcance;
                            statsObj[agente].sum_promessa += promessa;
                        };

                        if (rawQ.includes('1')) {
                            distCount['1º Quartil']++;
                            updateStats(q1Stats, op.agente);
                        }
                        else if (rawQ.includes('2')) {
                            distCount['2º Quartil']++;
                            updateStats(q2Stats, op.agente);
                        }
                        else if (rawQ.includes('3')) {
                            distCount['3º Quartil']++;
                            updateStats(q3Stats, op.agente);
                        }
                        else if (rawQ.includes('4')) {
                            distCount['4º Quartil']++;
                            updateStats(q4Stats, op.agente);
                        }
                    });

                    const renderQCards = (statsMap, containerId, iconClass, colorClass) => {
                        const arr = Object.entries(statsMap).sort((a, b) => b[1].count - a[1].count).slice(0, 12);
                        const container = document.getElementById(containerId);
                        if (!container) return;
                        container.innerHTML = '';
                        if (arr.length === 0) container.innerHTML = '<div style="color:var(--text-secondary); padding: 20px;">Nenhum operador registrado.</div>';

                        let colorHex = 'var(--text-primary)';
                        if (colorClass === 'badge-1q') colorHex = 'var(--accent-emerald)';
                        if (colorClass === 'badge-2q') colorHex = 'var(--accent-blue)';
                        if (colorClass === 'badge-3q') colorHex = 'var(--accent-amber)';
                        if (colorClass === 'badge-4q') colorHex = 'var(--accent-rose)';

                        arr.forEach((item, idx) => {
                            const pctMeta = formatPct(item[1].sum_alcance / item[1].count);
                            container.innerHTML += `
                                <div class="q-card ${idx < 3 ? 'highlight' : ''}" style="${idx < 3 && colorClass === 'badge-1q' ? 'border-color: rgba(16,185,129,0.3); animation: pulse-glow-green 2s infinite;' : ''}">
                                    <div class="q-rank" style="background: var(--bg-secondary); border: 1px solid var(--border);">#${idx + 1}</div>
                                    <div class="q-info">
                                        <div class="q-name">${item[0]}</div>
                                        <div class="q-count" style="color: ${colorHex}"><i class="${iconClass}"></i> ${item[1].count} vezes</div>
                                        <div style="font-size:0.75rem;margin-top:5px;color:rgba(255,255,255,0.8);">
                                            Alcance H.O: <b>${formatPct(item[1].sum_alcance / item[1].count)}</b> | 
                                            Promessas: <b>${formatNum(item[1].sum_promessa)}</b>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                    };

                    renderQCards(q1Stats, 'quartil1Cards', 'fas fa-star', 'badge-1q');
                    renderQCards(q2Stats, 'quartil2Cards', 'fas fa-medal', 'badge-2q');
                    renderQCards(q3Stats, 'quartil3Cards', 'fas fa-award', 'badge-3q');
                    renderQCards(q4Stats, 'quartil4Cards', 'fas fa-exclamation-triangle', 'badge-4q');

                    if (charts.quartilDist) charts.quartilDist.destroy();
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

            if (activePanelId === 'alares') {
                const filteredAlares = (DASHBOARD_DATA.alares || []).filter(d => {
                    const mNorm = d.mes;
                    const year = (d.ano || "").toString();
                    if (selAno.length > 0 && !selAno.includes(year)) return false;
                    if (selMes.length > 0 && !selMes.includes(mNorm)) return false;
                    return true;
                });

                // KPIs
                const totalVar = filteredAlares.reduce((s, d) => s + (d.variavel || 0), 0);
                const totalDig = filteredAlares.reduce((s, d) => s + (d.digital || 0), 0);
                const totalPA = filteredAlares.reduce((s, d) => s + (d.pa_fixa || 0), 0);
                const totalVarFixa = filteredAlares.reduce((s, d) => s + (d.var_fixa || 0), 0);
                const totalFinal = filteredAlares.reduce((s, d) => s + (d.total || 0), 0);

                const kpiAlares = document.getElementById('kpiAlares');
                if (kpiAlares) {
                    kpiAlares.innerHTML = `
                        <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-value">${formatBRL(totalVar)}</div><div class="kpi-label">Total Variável</div></div>
                        <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-mobile-alt"></i></div><div class="kpi-value">${formatBRL(totalDig)}</div><div class="kpi-label">Total Digital</div></div>
                        <div class="kpi-card amber"><div class="kpi-icon"><i class="fas fa-desktop"></i></div><div class="kpi-value">${formatBRL(totalPA)}</div><div class="kpi-label">Total PA Fixa</div></div>
                        <div class="kpi-card cyan" style="border: 1px solid var(--accent-blue); background: rgba(6,182,212,0.1);"><div class="kpi-icon"><i class="fas fa-plus-circle"></i></div><div class="kpi-value">${formatBRL(totalVarFixa)}</div><div class="kpi-label">Variável + Fixa</div></div>
                        <div class="kpi-card purple" style="transform: scale(1.05); border: 1px solid var(--accent-purple); box-shadow: 0 0 20px rgba(139,92,246,0.2);"><div class="kpi-icon"><i class="fas fa-file-invoice-dollar"></i></div><div class="kpi-value">${formatBRL(totalFinal)}</div><div class="kpi-label" style="font-weight: bold; color: #fff;">VALOR FINAL</div></div>
                    `;
                }

                // Table
                const tbody = document.getElementById('tbodyAlares');
                if (tbody) {
                    tbody.innerHTML = '';
                    filteredAlares.sort((a, b) => {
                        const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                        return (a.ano * 100 + months.indexOf(a.mes)) - (b.ano * 100 + months.indexOf(b.mes));
                    }).forEach(d => {
                        const row = document.createElement('tr');
                        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                        row.innerHTML = `
                            <td style="padding: 12px; text-align: center; text-transform: capitalize;">${d.mes} ${d.ano}</td>
                            <td style="padding: 12px; text-align: center;">${formatBRL(d.variavel)}</td>
                            <td style="padding: 12px; text-align: center;">${formatBRL(d.digital)}</td>
                            <td style="padding: 12px; text-align: center;">${formatBRL(d.pa_fixa)}</td>
                            <td style="padding: 12px; text-align: center; color: var(--accent-blue); font-weight: 500;">${formatBRL(d.var_fixa)}</td>
                            <td style="padding: 12px; text-align: center; font-weight: bold; color: var(--accent-emerald); background: rgba(16,185,129,0.05);">${formatBRL(d.total)}</td>
                        `;
                        tbody.appendChild(row);
                    });
                }

                // Chart
                if (charts.alaresEvol) charts.alaresEvol.destroy();
                const ctxEvol = document.getElementById('chartAlaresEvol');
                if (ctxEvol) {
                    const sortedData = [...filteredAlares].sort((a, b) => {
                        const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                        return (a.ano * 100 + months.indexOf(a.mes)) - (b.ano * 100 + months.indexOf(b.mes));
                    });
                    charts.alaresEvol = new Chart(ctxEvol, {
                        type: 'line',
                        data: {
                            labels: sortedData.map(d => `${d.mes.substring(0, 3).toUpperCase()} ${d.ano}`),
                            datasets: [
                                { label: 'Variável', data: sortedData.map(d => d.variavel), borderColor: '#3b82f6', fill: false, tension: 0.3 },
                                { label: 'Digital', data: sortedData.map(d => d.digital), borderColor: '#10b981', fill: false, tension: 0.3 },
                                { label: 'PA Fixa', data: sortedData.map(d => d.pa_fixa), borderColor: '#f59e0b', fill: false, tension: 0.3 },
                                { label: 'V+F', data: sortedData.map(d => d.var_fixa), borderColor: '#06b6d4', borderDash: [5, 5], fill: false, tension: 0.3 },
                                { label: 'Total', data: sortedData.map(d => d.total), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3, borderWidth: 3 }
                            ]
                        },
                        options: {
                            plugins: { datalabels: { display: false } },
                            scales: { y: { ticks: { callback: v => formatBRL(v) } } }
                        }
                    });
                }
            }
            if (activePanelId === 'agoracred') {
                const filteredAgoracred = (DASHBOARD_DATA.agoracred || []).filter(d => {
                    const mNorm = d.mes_norm;
                    if (selMes.length > 0 && mNorm && !selMes.includes(mNorm)) return false;
                    
                    const year = d.ano || "";
                    if (selAno.length > 0 && year && !selAno.includes(year)) return false;
                    
                    return true;
                });

                const totalPlano = filteredAgoracred.reduce((s, d) => s + (d.fat_plano || 0), 0);
                const totalProduzido = filteredAgoracred.reduce((s, d) => s + (d.fat_produzido || 0), 0);
                const diferenca = totalPlano - totalProduzido;

                const kpiAgoracred = document.getElementById('kpiAgoracred');
                if (kpiAgoracred) {
                    kpiAgoracred.innerHTML = `
                        <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-file-invoice-dollar"></i></div><div class="kpi-value">${formatBRL(totalPlano)}</div><div class="kpi-label">Faturamento Plano</div></div>
                        <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-chart-line"></i></div><div class="kpi-value">${formatBRL(totalProduzido)}</div><div class="kpi-label">Fat Produzido Mês</div></div>
                        <div class="kpi-card ${diferenca >= 0 ? 'cyan' : 'rose'}" style="border: 1px solid var(--accent-${diferenca >= 0 ? 'blue' : 'rose'});"><div class="kpi-icon"><i class="fas fa-balance-scale"></i></div><div class="kpi-value">${formatBRL(diferenca)}</div><div class="kpi-label">Diferença</div></div>
                    `;
                }

                const formatMesPgNota = (m) => {
                    if (!m) return '';
                    if (typeof m === 'string' && m.includes('T')) {
                        const datePart = m.split('T')[0].split('-');
                        if (datePart.length === 3) return `${datePart[2]}/${datePart[1]}/${datePart[0]}`;
                    }
                    return m;
                };

                const tbody = document.getElementById('tbodyAgoracred');
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    // Group data by mes_pg_nota to handle Excel merged cells
                    let currentGroup = [];
                    const groups = [];
                    filteredAgoracred.forEach((d, i) => {
                        if (i === 0) {
                            currentGroup.push(d);
                        } else {
                            if (d.mes_pg_nota === currentGroup[0].mes_pg_nota && d.mes_pg_nota) {
                                currentGroup.push(d);
                            } else {
                                groups.push(currentGroup);
                                currentGroup = [d];
                            }
                        }
                    });
                    if (currentGroup.length > 0) groups.push(currentGroup);

                    groups.forEach(group => {
                        const rowSpan = group.length;
                        const firstItem = group[0];
                        const diff = (firstItem.fat_plano || 0) - (firstItem.fat_produzido || 0);
                        
                        group.forEach((d, index) => {
                            const row = document.createElement('tr');
                            const isLastInGroup = index === rowSpan - 1;
                            const borderStyle = isLastInGroup ? '1px solid rgba(255,255,255,0.1)' : '1px dashed rgba(255,255,255,0.05)';
                            row.style.borderBottom = borderStyle;
                            
                            let html = `
                                <td style="padding: 12px; text-align: center;">${d.periodo || ''} / ${formatMesPgNota(d.mes_pg_nota)}</td>
                                <td style="padding: 12px; text-align: center;">${d.numero_nf || ''}</td>
                                <td style="padding: 12px; text-align: center;">${formatBRL(d.fat_quinzena)}</td>
                                <td style="padding: 12px; text-align: center;">${formatBRL(d.imposto_nota)}</td>
                            `;
                            
                            // Only append the merged columns on the first row of the group
                            if (index === 0) {
                                html += `
                                    <td rowspan="${rowSpan}" style="padding: 12px; text-align: center; color: var(--accent-blue); font-weight: 500; vertical-align: middle; border-left: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);">${firstItem.fat_plano ? formatBRL(firstItem.fat_plano) : '-'}</td>
                                    <td rowspan="${rowSpan}" style="padding: 12px; text-align: center; color: var(--accent-green); font-weight: 500; vertical-align: middle; border-left: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1);">${firstItem.fat_produzido ? formatBRL(firstItem.fat_produzido) : '-'}</td>
                                    <td rowspan="${rowSpan}" style="padding: 12px; text-align: center; font-weight: bold; color: ${diff >= 0 ? '#10b981' : '#f43f5e'}; vertical-align: middle; border-left: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1);">${(firstItem.fat_plano || firstItem.fat_produzido) ? formatBRL(diff) : '-'}</td>
                                `;
                            }
                            
                            row.innerHTML = html;
                            tbody.appendChild(row);
                        });
                    });
                }

                const formatMesAno = (m) => {
                    if (!m) return '';
                    if (typeof m === 'string' && m.includes('T')) m = m.split('T')[0];
                    if (typeof m === 'string' && m.includes('-')) {
                        const parts = m.split('-');
                        if (parts.length >= 2) return parts[1] + '/' + parts[0].slice(2);
                    }
                    return m;
                };

                if (charts.agoracredDif) charts.agoracredDif.destroy();
                const ctxDif = document.getElementById('chartAgoracredDif');
                if (ctxDif) {
                    const labels = [];
                    const dataPlano = [];
                    const dataProduzido = [];
                    const dataQuinzena = [];
                    const dataDiff = [];
                    
                    let currentPlano = 0;
                    let currentProduzido = 0;
                    
                    filteredAgoracred.forEach(d => {
                        const mOp = formatMesAno(d.mes_op);
                        const mPg = formatMesAno(d.mes_pg_nota);
                        labels.push(`OP: ${mOp} | PG: ${mPg}`);
                        
                        // Carry over the monthly values to the second fortnight so the line doesn't drop to 0
                        if (d.fat_plano) currentPlano = d.fat_plano;
                        if (d.fat_produzido) currentProduzido = d.fat_produzido;
                        
                        dataPlano.push(currentPlano);
                        dataProduzido.push(currentProduzido);
                        dataQuinzena.push(d.fat_quinzena || 0);
                        dataDiff.push(currentProduzido - currentPlano);
                    });

                    const ctx = ctxDif.getContext('2d');
                    const gradPlano = ctx.createLinearGradient(0, 0, 0, 300);
                    gradPlano.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                    gradPlano.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                    
                    const gradProd = ctx.createLinearGradient(0, 0, 0, 300);
                    gradProd.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
                    gradProd.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

                    charts.agoracredDif = new Chart(ctxDif, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    type: 'line',
                                    label: 'Fat Produzido Mês',
                                    data: dataProduzido,
                                    borderColor: '#10b981',
                                    backgroundColor: gradProd,
                                    borderWidth: 3,
                                    fill: true,
                                    tension: 0.3,
                                    pointBackgroundColor: '#1a1f35',
                                    pointBorderColor: '#10b981',
                                    pointBorderWidth: 2,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    order: 1
                                },
                                {
                                    type: 'line',
                                    label: 'Faturamento Plano',
                                    data: dataPlano,
                                    borderColor: '#3b82f6',
                                    backgroundColor: gradPlano,
                                    borderWidth: 3,
                                    fill: true,
                                    tension: 0.3,
                                    pointBackgroundColor: '#1a1f35',
                                    pointBorderColor: '#3b82f6',
                                    pointBorderWidth: 2,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    order: 2
                                },
                                {
                                    type: 'bar',
                                    label: 'Fat Quinzena',
                                    data: dataQuinzena,
                                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                                    borderColor: '#8b5cf6',
                                    borderWidth: 1,
                                    borderRadius: 6,
                                    barPercentage: 0.5,
                                    order: 3
                                },
                                {
                                    type: 'bar',
                                    label: 'Diferença (Prod - Plano)',
                                    data: dataDiff,
                                    backgroundColor: (context) => {
                                        const val = context.raw || 0;
                                        return val >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(244, 63, 94, 0.7)';
                                    },
                                    borderRadius: 4,
                                    barPercentage: 0.3,
                                    hidden: true, // Hidden by default to keep it clean
                                    order: 4
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    labels: {
                                        padding: 20,
                                        font: { family: 'Inter', size: 12 },
                                        usePointStyle: true,
                                        boxWidth: 8
                                    }
                                },
                                datalabels: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(26, 31, 53, 0.95)',
                                    titleFont: { size: 13, family: 'Inter' },
                                    bodyFont: { size: 12, family: 'Inter' },
                                    padding: 12,
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderWidth: 1,
                                    callbacks: {
                                        label: (context) => {
                                            return context.dataset.label + ': ' + formatBRL(context.raw);
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                    ticks: {
                                        font: { size: 10 },
                                        maxRotation: 45,
                                        minRotation: 45
                                    }
                                },
                                y: {
                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                    ticks: { callback: v => formatBRL(v) }
                                }
                            }
                        }
                    });
                }
            }

            if (activePanelId === 'dispersao') {
                const dispersaoGrid = document.getElementById('carteirasGrid');
                if (!dispersaoGrid) return;
                
                let opsFilter = (DASHBOARD_DATA.operadores || []).filter(o => {
                    const year = o.ano ? o.ano.toString() : '';
                    const mNorm = o.mes ? o.mes.toString() : '';
                    if (selAno.length > 0 && !selAno.includes(year)) return false;
                    if (selMes.length > 0 && !selMes.includes(mNorm)) return false;
                    return true;
                });
                
                const getPromValDisp = v => (v != null && !isNaN(Number(v))) ? Number(v) : 0;
                const getHOValDisp = v => (v != null && !isNaN(Number(v))) ? Number(v) : 0;
                
                opsFilter = opsFilter.filter(o => (o.agente || '').trim() !== 'Ana Lays Garces Lopes');
                
                const grouped = {};
                opsFilter.forEach(o => {
                    const opName = o.operacao || 'Sem Operação';
                    if (!grouped[opName]) grouped[opName] = [];
                    grouped[opName].push(o);
                });
                
                // Remove existing debug box if any
                const oldDebug = dispersaoGrid.parentNode.querySelector('.debug-dispersao');
                if (oldDebug) oldDebug.remove();

                let carteirasList = [];
                
                Object.keys(grouped).forEach(opName => {
                    if (selEq.length > 0 && !selEq.some(eq => opMatches(opName, eq))) return;
                    
                    const group = grouped[opName];
                    const groupValidHO = group.filter(o => getHOValDisp(o.ho) > 0);
                    const groupValidProm = group.filter(o => getPromValDisp(o.promessa) > 0);
                    
                    if (groupValidHO.length === 0 && groupValidProm.length === 0) return;
                    
                    const ho_n = groupValidHO.length;
                    const ho_max = ho_n > 0 ? Math.max(...groupValidHO.map(o => getHOValDisp(o.ho))) : 0;
                    
                    groupValidHO.sort((a,b) => getHOValDisp(b.ho) - getHOValDisp(a.ho));
                    
                    let ho_disp_sum = 0;
                    let ho_disp_count = 0;
                    const ho_quartis = {1:[], 2:[], 3:[], 4:[]};
                    
                    groupValidHO.forEach((o, idx) => {
                        const pct = ho_n <= 1 ? 0 : idx / (ho_n - 1);
                        let q = 4;
                        if (pct <= 0.25) q = 1;
                        else if (pct <= 0.50) q = 2;
                        else if (pct <= 0.75) q = 3;
                        
                        const val = getHOValDisp(o.ho);
                        const disp = ho_max > 0 ? (val / ho_max) * 100 : 0;
                        ho_disp_sum += disp;
                        ho_disp_count++;
                        
                        ho_quartis[q].push({val, disp});
                    });
                    
                    const media_ho = ho_n > 0 ? groupValidHO.reduce((acc, curr) => acc + getHOValDisp(curr.ho), 0) / ho_n : 0;
                    const media_dispersao_ho = ho_disp_count > 0 ? ho_disp_sum / ho_disp_count : 0;
                    
                    const prom_n = groupValidProm.length;
                    const prom_max = prom_n > 0 ? Math.max(...groupValidProm.map(o => getPromValDisp(o.promessa))) : 0;
                    groupValidProm.sort((a,b) => getPromValDisp(b.promessa) - getPromValDisp(a.promessa));
                    
                    let prom_disp_sum = 0;
                    let prom_disp_count = 0;
                    const prom_quartis = {1:[], 2:[], 3:[], 4:[]};
                    
                    groupValidProm.forEach((o, idx) => {
                        const pct = prom_n <= 1 ? 0 : idx / (prom_n - 1);
                        let q = 4;
                        if (pct <= 0.25) q = 1;
                        else if (pct <= 0.50) q = 2;
                        else if (pct <= 0.75) q = 3;
                        
                        const val = getPromValDisp(o.promessa);
                        const disp = prom_max > 0 ? (val / prom_max) * 100 : 0;
                        prom_disp_sum += disp;
                        prom_disp_count++;
                        
                        prom_quartis[q].push({val, disp});
                    });
                    
                    const media_promessas = prom_n > 0 ? groupValidProm.reduce((acc, curr) => acc + getPromValDisp(curr.promessa), 0) / prom_n : 0;
                    const media_dispersao_promessas = prom_disp_count > 0 ? prom_disp_sum / prom_disp_count : 0;
                    
                    // Generate validosHO by calculating dispHO and dispProm on the fly for the unified list of agents
                    const allAgentsMap = {};
                    group.forEach(o => {
                        if (!o.agente) return;
                        const hoVal = getHOValDisp(o.ho);
                        const promVal = getPromValDisp(o.promessa);
                        allAgentsMap[o.agente] = {
                            nome: o.carteira || o.agente,
                            h_o: hoVal,
                            promessas: promVal,
                            dispHO: ho_max > 0 ? (hoVal / ho_max) * 100 : 0,
                            dispProm: prom_max > 0 ? (promVal / prom_max) * 100 : 0
                        };
                    });
                    const mergedValidos = Object.values(allAgentsMap).sort((a,b) => {
                        return (b.dispHO !== a.dispHO) ? b.dispHO - a.dispHO : b.dispProm - a.dispProm;
                    });
                    
                    carteirasList.push({
                        operacao: opName,
                        qtd_agentes: ho_n > 0 ? ho_n : prom_n,
                        media_ho,
                        media_dispersao_ho,
                        ho_quartil_prod: {
                            '1º Quartil': ho_quartis[1].length ? ho_quartis[1].reduce((a,c)=>a+c.val,0)/ho_quartis[1].length : null,
                            '2º Quartil': ho_quartis[2].length ? ho_quartis[2].reduce((a,c)=>a+c.val,0)/ho_quartis[2].length : null,
                            '3º Quartil': ho_quartis[3].length ? ho_quartis[3].reduce((a,c)=>a+c.val,0)/ho_quartis[3].length : null,
                            '4º Quartil': ho_quartis[4].length ? ho_quartis[4].reduce((a,c)=>a+c.val,0)/ho_quartis[4].length : null
                        },
                        ho_quartil_disp: {
                            '1º Quartil': ho_quartis[1].length ? ho_quartis[1].reduce((a,c)=>a+c.disp,0)/ho_quartis[1].length : null,
                            '2º Quartil': ho_quartis[2].length ? ho_quartis[2].reduce((a,c)=>a+c.disp,0)/ho_quartis[2].length : null,
                            '3º Quartil': ho_quartis[3].length ? ho_quartis[3].reduce((a,c)=>a+c.disp,0)/ho_quartis[3].length : null,
                            '4º Quartil': ho_quartis[4].length ? ho_quartis[4].reduce((a,c)=>a+c.disp,0)/ho_quartis[4].length : null
                        },
                        media_promessas,
                        media_dispersao_promessas,
                        prom_quartil_prod: {
                            '1º Quartil': prom_quartis[1].length ? prom_quartis[1].reduce((a,c)=>a+c.val,0)/prom_quartis[1].length : null,
                            '2º Quartil': prom_quartis[2].length ? prom_quartis[2].reduce((a,c)=>a+c.val,0)/prom_quartis[2].length : null,
                            '3º Quartil': prom_quartis[3].length ? prom_quartis[3].reduce((a,c)=>a+c.val,0)/prom_quartis[3].length : null,
                            '4º Quartil': prom_quartis[4].length ? prom_quartis[4].reduce((a,c)=>a+c.val,0)/prom_quartis[4].length : null
                        },
                        prom_quartil_disp: {
                            '1º Quartil': prom_quartis[1].length ? prom_quartis[1].reduce((a,c)=>a+c.disp,0)/prom_quartis[1].length : null,
                            '2º Quartil': prom_quartis[2].length ? prom_quartis[2].reduce((a,c)=>a+c.disp,0)/prom_quartis[2].length : null,
                            '3º Quartil': prom_quartis[3].length ? prom_quartis[3].reduce((a,c)=>a+c.disp,0)/prom_quartis[3].length : null,
                            '4º Quartil': prom_quartis[4].length ? prom_quartis[4].reduce((a,c)=>a+c.disp,0)/prom_quartis[4].length : null
                        },
                        validosHO: mergedValidos
                    });
                });
                
                carteirasList.sort((a,b) => {
                    const sortA = a.media_dispersao_ho > 0 ? a.media_dispersao_ho : a.media_dispersao_promessas;
                    const sortB = b.media_dispersao_ho > 0 ? b.media_dispersao_ho : b.media_dispersao_promessas;
                    return sortB - sortA;
                });
                
                dispersaoGrid.innerHTML = carteirasList.map(c => {
                    const hoProdStr = c.media_ho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const hoDispStr = c.media_dispersao_ho.toFixed(1) + '%';
                    const hoFillWidth = Math.min(100, Math.max(0, c.media_dispersao_ho));
                    
                    const promProdStr = Math.round(c.media_promessas).toLocaleString('pt-BR');
                    const promDispStr = c.media_dispersao_promessas.toFixed(1) + '%';
                    const promFillWidth = Math.min(100, Math.max(0, c.media_dispersao_promessas));
                    
                    const getDispClass = (val) => {
                        if (val >= 75) return 'q1';
                        if (val >= 50) return 'q2';
                        if (val >= 25) return 'q3';
                        return 'q4';
                    };
                    const hoDispClass = getDispClass(c.media_dispersao_ho);
                    const promDispClass = getDispClass(c.media_dispersao_promessas);
                    
                    let carteiraNomeAmigavel = c.operacao;
                    if (c.operacao.includes('/')) {
                        carteiraNomeAmigavel = c.operacao.split('/')[1].trim();
                    } else if (c.operacao.includes('-')) {
                        carteiraNomeAmigavel = c.operacao.split('-')[1].trim();
                    }
                    
                    const renderQDisp = (qMap, qKey) => {
                        const val = qMap ? qMap[qKey] : null;
                        return val !== null && val !== undefined ? val.toFixed(1) + '%' : '—';
                    };
                    const renderQProdHO = (qMap, qKey) => {
                        const val = qMap ? qMap[qKey] : null;
                        return val !== null && val !== undefined ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
                    };
                    const renderQProdProm = (qMap, qKey) => {
                        const val = qMap ? qMap[qKey] : null;
                        return val !== null && val !== undefined ? Math.round(val).toLocaleString('pt-BR') : '—';
                    };
                    const getQClass = (qMap, qKey, def) => {
                        return (qMap && qMap[qKey] !== null) ? def : 'muted';
                    };
                    
                    return `
                        <div class="carteira-card">
                            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 22px;">
                                <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(95,173,65,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #5fad41;">
                                    <i class="fas fa-briefcase"></i>
                                </div>
                                <div>
                                    <h3 style="font-size: 1.15rem; color: var(--text-primary); font-weight: 800; margin-bottom: 4px;">${carteiraNomeAmigavel}</h3>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${c.operacao} · ${c.qtd_agentes} operadores ativos</div>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex-grow: 1;">
                                <!-- Coluna H.O -->
                                <div style="display: flex; flex-direction: column; background: var(--bg-body); border-radius: 10px; padding: 18px; border: 1px solid var(--border);">
                                    <div style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; border-left: 3px solid #5fad41; padding-left: 8px; margin-bottom: 16px;">
                                        Honorários (H.O)
                                    </div>
                                    <div style="margin-bottom: 16px; flex-grow: 1;">
                                        <div class="stat-item">
                                            <span class="stat-label">Produção Média:</span>
                                            <span class="stat-val" style="color: var(--text-primary);">${hoProdStr}</span>
                                        </div>
                                        <div class="stat-item" style="margin-top: 4px;">
                                            <span class="stat-label">Dispersão Média:</span>
                                            <span class="stat-val ${c.media_dispersao_ho < 50 ? 'text-danger' : 'text-success'}">${hoDispStr}</span>
                                        </div>
                                    </div>
                                    <div class="dispersion-wrap" style="margin-top: auto;">
                                        <div class="disp-bar-track" style="height: 6px;">
                                            <div class="disp-bar-fill ${hoDispClass}" style="width: ${hoFillWidth}%"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Quartis Disp -->
                                    <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--border);">
                                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Média de Dispersão por Quartil</div>
                                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                                            <div class="q-pill ${getQClass(c.ho_quartil_disp, '1º Quartil', 'q1')}">Q1: ${renderQDisp(c.ho_quartil_disp, '1º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.ho_quartil_disp, '2º Quartil', 'q2')}">Q2: ${renderQDisp(c.ho_quartil_disp, '2º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.ho_quartil_disp, '3º Quartil', 'q3')}">Q3: ${renderQDisp(c.ho_quartil_disp, '3º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.ho_quartil_disp, '4º Quartil', 'q4')}">Q4: ${renderQDisp(c.ho_quartil_disp, '4º Quartil')}</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Quartis Prod -->
                                    <div style="margin-top: 12px;">
                                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Média de Produção por Quartil</div>
                                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                                            <div class="q-pill ${getQClass(c.ho_quartil_prod, '1º Quartil', 'q1')}">Q1: ${renderQProdHO(c.ho_quartil_prod, '1º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.ho_quartil_prod, '2º Quartil', 'q2')}">Q2: ${renderQProdHO(c.ho_quartil_prod, '2º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.ho_quartil_prod, '3º Quartil', 'q3')}">Q3: ${renderQProdHO(c.ho_quartil_prod, '3º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.ho_quartil_prod, '4º Quartil', 'q4')}">Q4: ${renderQProdHO(c.ho_quartil_prod, '4º Quartil')}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Coluna Promessas -->
                                <div style="display: flex; flex-direction: column; background: var(--bg-body); border-radius: 10px; padding: 18px; border: 1px solid var(--border);">
                                    <div style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; border-left: 3px solid #5fad41; padding-left: 8px; margin-bottom: 16px;">
                                        Promessas de Pagamento
                                    </div>
                                    <div style="margin-bottom: 16px; flex-grow: 1;">
                                        <div class="stat-item">
                                            <span class="stat-label">Produção Média:</span>
                                            <span class="stat-val" style="color: var(--text-primary);">${promProdStr} <span style="font-size:0.75rem; font-weight:500; color:var(--text-secondary)">prom.</span></span>
                                        </div>
                                        <div class="stat-item" style="margin-top: 4px;">
                                            <span class="stat-label">Dispersão Média:</span>
                                            <span class="stat-val ${c.media_dispersao_promessas < 50 ? 'text-danger' : 'text-success'}">${promDispStr}</span>
                                        </div>
                                    </div>
                                    <div class="dispersion-wrap" style="margin-top: auto;">
                                        <div class="disp-bar-track" style="height: 6px;">
                                            <div class="disp-bar-fill ${promDispClass}" style="width: ${promFillWidth}%"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Quartis Disp -->
                                    <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--border);">
                                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Média de Dispersão por Quartil</div>
                                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                                            <div class="q-pill ${getQClass(c.prom_quartil_disp, '1º Quartil', 'q1')}">Q1: ${renderQDisp(c.prom_quartil_disp, '1º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.prom_quartil_disp, '2º Quartil', 'q2')}">Q2: ${renderQDisp(c.prom_quartil_disp, '2º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.prom_quartil_disp, '3º Quartil', 'q3')}">Q3: ${renderQDisp(c.prom_quartil_disp, '3º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.prom_quartil_disp, '4º Quartil', 'q4')}">Q4: ${renderQDisp(c.prom_quartil_disp, '4º Quartil')}</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Quartis Prod -->
                                    <div style="margin-top: 12px;">
                                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Média de Produção por Quartil</div>
                                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                                            <div class="q-pill ${getQClass(c.prom_quartil_prod, '1º Quartil', 'q1')}">Q1: ${renderQProdProm(c.prom_quartil_prod, '1º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.prom_quartil_prod, '2º Quartil', 'q2')}">Q2: ${renderQProdProm(c.prom_quartil_prod, '2º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.prom_quartil_prod, '3º Quartil', 'q3')}">Q3: ${renderQProdProm(c.prom_quartil_prod, '3º Quartil')}</div>
                                            <div class="q-pill ${getQClass(c.prom_quartil_prod, '4º Quartil', 'q4')}">Q4: ${renderQProdProm(c.prom_quartil_prod, '4º Quartil')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        setTimeout(() => {
            ['overview', 'faturamento', 'comparativo', 'operadores', 'quartil', 'dispersao', 'alares', 'agoracred'].forEach(p => updateTeamFilter(p));
            renderCharts();
        }, 300);
    };

    // --- AUTH LOGIC ---
    const btn = document.getElementById('loginBtn');
    const input = document.getElementById('loginInput');
    const err = document.getElementById('loginError');

    const attemptLogin = () => {
        try {
            if (!input || !btn || !err) return;
            if (input.value.trim() === '1926') {
                err.style.display = 'none';
                const overlay = document.getElementById('loginOverlay');
                const content = document.getElementById('appContent');
                if (overlay) overlay.style.display = 'none';
                if (content) content.style.display = 'flex';
                initApp();
            } else {
                err.style.display = 'block';
                input.value = '';
                input.focus();
            }
        } catch (error) {
            console.error("Login attempt failed:", error);
        }
    };

    if (btn) btn.addEventListener('click', attemptLogin);
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

});
