document.addEventListener('DOMContentLoaded', () => {

    const initApp = () => {
        // Formatters
        const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
        const formatNum = (val) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val || 0);
        const formatPct = (val) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(val || 0);

        const { operadores, meta2025, meta2024, meta_cnu, producao_operacoes, fechamentos2026 } = DASHBOARD_DATA;

        const normalizeMonth = (m) => {
            if (!m) return '';
            let str = m;
            if (m.includes('-') && m.includes('T')) {
                const date = new Date(m);
                if (!isNaN(date)) str = date.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
            }
            return str.toUpperCase().trim().replace('Ç', 'C').replace('ç', 'c');
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
            if (!item.mes || item.mes === 'MÊS' || item.mes === 'MS') return;
            unifiedMeta.push({
                ano: ano || item.ano || 2024,
                mes: normalizeMonth(item.mes),
                operacao: item.operacao || 'N/A',
                arrecadado: item.arrecadado || item.faturamento || 0,
                meta: item.meta || 0
            });
        };

        meta2024.forEach(d => addToUnified(d, 2024));
        meta2025.forEach(d => addToUnified(d, 2025));
        if (meta_cnu) meta_cnu.forEach(d => addToUnified(d, d.ano));

        if (fechamentos2026 && fechamentos2026.length > 1) {
            fechamentos2026.slice(1).forEach(row => {
                if (row[0] && row[0] !== 'MÊS') {
                    unifiedMeta.push({
                        ano: 2026, mes: normalizeMonth(row[0]), operacao: row[1] || 'N/A',
                        arrecadado: row[2] || 0, meta: row[3] || 0
                    });
                }
            });
        }

        const getTeams = (arr) => {
            const s = new Set();
            arr.forEach(d => { if(d.operacao) s.add(d.operacao); });
            return [...s].sort();
        };

        const eqProd = getTeams(producao_operacoes);
        const eqMeta = getTeams(unifiedMeta);
        const eqOper = getTeams(operadores);

        const mesesOrdemOriginal = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

        // HTML generator for filters
        const buildFiltersHTML = (panelId, teams, showQuartil = false) => {
            let teamsHTML = teams.map(t => `<label><input type="checkbox" value="${t}" class="opt-cb" checked> ${t}</label>`).join('');
            let mesesHTML = mesesOrdemOriginal.map(m => `<label><input type="checkbox" value="${normalizeMonth(m)}" class="opt-cb" checked> ${m}</label>`).join('');
            let anosHTML = [2024, 2025, 2026].map(a => `<label><input type="checkbox" value="${a}" class="opt-cb" ${a === 2025 ? 'checked' : ''}> ${a}</label>`).join('');
            
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
                    if (checkedCount === 0) textSpan.textContent = 'Nenhum selecionado';
                    else if (checkedCount === cbs.length) textSpan.textContent = `Todos`;
                    else textSpan.textContent = `${checkedCount} selecionados`;
                    
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
            return s1.includes(s2) || s2.includes(s1);
        };

        function renderCharts() {
            const activePanelId = document.querySelector('.panel.active').id.replace('panel-', '');

            const selEq = getSelected(activePanelId, 'dd-equipe');
            const selMes = getSelected(activePanelId, 'dd-mes');
            const selAno = getSelected(activePanelId, 'dd-ano');
            const selQuartilHO = getSelected(activePanelId, 'dd-quartil-ho');
            const selQuartilProm = getSelected(activePanelId, 'dd-quartil-prom');

            if (activePanelId === 'overview') {
                let filteredOps = producao_operacoes.filter(d => {
                    if (!selEq.some(eq => opMatches(d.operacao, eq))) return false;
                    if (d.mes) {
                        const date = new Date(d.mes);
                        if (!isNaN(date)) {
                            const mName = normalizeMonth(d.mes);
                            const year = date.getUTCFullYear().toString();
                            if (!selMes.includes(mName)) return false;
                            if (!selAno.includes(year)) return false;
                        }
                    } else return false;
                    return true;
                });

                const groupedOps = {};
                filteredOps.forEach(d => {
                    const eq = d.operacao || 'Outros';
                    if(!groupedOps[eq]) groupedOps[eq] = {ho: 0, alo: 0, cpc: 0, promessa: 0};
                    groupedOps[eq].ho += (d.ho || 0);
                    groupedOps[eq].alo += (d.alo || 0);
                    groupedOps[eq].cpc += (d.cpc || 0);
                    groupedOps[eq].promessa += (d.promessa || 0);
                });

                const totalHO = Object.values(groupedOps).reduce((s, a) => s + a.ho, 0);
                document.getElementById('kpiOverview').innerHTML = `
                    <div class="kpi-card blue"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-value">${formatBRL(totalHO)}</div><div class="kpi-label">Faturamento Selecionado</div></div>
                    <div class="kpi-card green"><div class="kpi-icon"><i class="fas fa-chart-line"></i></div><div class="kpi-value">${formatNum(Object.values(groupedOps).reduce((s, a) => s + a.promessa, 0))}</div><div class="kpi-label">Total Promessas</div></div>
                    <div class="kpi-card amber"><div class="kpi-icon"><i class="fas fa-phone"></i></div><div class="kpi-value">${formatNum(Object.values(groupedOps).reduce((s, a) => s + a.alo, 0))}</div><div class="kpi-label">Total ALÔs</div></div>
                    <div class="kpi-card rose"><div class="kpi-icon"><i class="fas fa-user-check"></i></div><div class="kpi-value">${formatNum(Object.values(groupedOps).reduce((s, a) => s + a.cpc, 0))}</div><div class="kpi-label">Total CPC</div></div>
                `;

                const teamCardsContainer = document.getElementById('teamCards');
                teamCardsContainer.innerHTML = '';
                Object.keys(groupedOps).sort((a,b) => groupedOps[b].ho - groupedOps[a].ho).forEach((team, i) => {
                    const colors = ['blue', 'green', 'amber', 'rose', 'purple', 'cyan'];
                    const c = colors[i % colors.length];
                    teamCardsContainer.innerHTML += `
                        <div class="kpi-card ${c}">
                            <div class="kpi-label" style="font-size: 0.85rem; color: #fff; margin-bottom: 10px; font-weight: 700;">${team.substring(0, 30)}</div>
                            <div class="kpi-value" style="font-size: 1.3rem;">${formatBRL(groupedOps[team].ho)}</div>
                            <div style="font-size: 0.75rem; margin-top: 8px; color: var(--text-secondary);">
                                <i class="fas fa-check-circle"></i> CPC: ${formatNum(groupedOps[team].cpc)} | <i class="fas fa-handshake"></i> PROM: ${formatNum(groupedOps[team].promessa)}
                            </div>
                        </div>
                    `;
                });

                const timeSeries = {};
                filteredOps.forEach(d => {
                    if(!d.mes) return;
                    const dt = new Date(d.mes);
                    if(isNaN(dt)) return;
                    const mKey = `${dt.toLocaleDateString('pt-BR', {month: 'short', timeZone:'UTC'})} ${dt.getUTCFullYear()}`;
                    if(!timeSeries[mKey]) timeSeries[mKey] = { sortVal: dt.getTime() };
                    const eq = d.operacao || 'Outros';
                    if(!timeSeries[mKey][eq]) timeSeries[mKey][eq] = 0;
                    timeSeries[mKey][eq] += d.ho || 0;
                });

                const labelsTime = Object.keys(timeSeries).sort((a,b) => timeSeries[a].sortVal - timeSeries[b].sortVal);
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];
                
                if(charts.fatOverview) charts.fatOverview.destroy();
                charts.fatOverview = new Chart(document.getElementById('chartFatOverview'), {
                    type: 'line',
                    data: { 
                        labels: labelsTime, 
                        datasets: Object.keys(groupedOps).map((team, i) => ({
                            label: team.substring(0,20),
                            data: labelsTime.map(l => timeSeries[l][team] || 0),
                            borderColor: colors[i % colors.length],
                            backgroundColor: colors[i % colors.length] + '22',
                            fill: true, tension: 0.3
                        }))
                    },
                    options: { plugins: { datalabels: { display: false } } }
                });

                if(charts.distOp) charts.distOp.destroy();
                charts.distOp = new Chart(document.getElementById('chartDistOp'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(groupedOps).map(l => l.substring(0,20)),
                        datasets: [{ data: Object.values(groupedOps).map(d => d.ho), backgroundColor: colors, borderWidth: 0 }]
                    },
                    options: { cutout: '65%', plugins: { legend: { position: 'right' }, datalabels: { display: false } } }
                });

                if(charts.promessas) charts.promessas.destroy();
                charts.promessas = new Chart(document.getElementById('chartPromessas'), {
                    type: 'bar',
                    data: {
                        labels: Object.keys(groupedOps).map(l => l.substring(0,15)),
                        datasets: [{ label: 'Promessas', data: Object.values(groupedOps).map(d => d.promessa), backgroundColor: '#10b981', borderRadius: 4 }]
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

                const mesesOrdemMap = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
                const aggMetaTime = {};
                filteredMeta.forEach(d => {
                    const k = `${d.mes} ${d.ano}`;
                    if(!aggMetaTime[k]) aggMetaTime[k] = { arrecadado: 0, meta: 0, sortIdx: d.ano * 100 + mesesOrdemMap.indexOf(d.mes) };
                    aggMetaTime[k].arrecadado += (d.arrecadado || 0);
                    aggMetaTime[k].meta += (d.meta || 0);
                });

                const labelsMeta = Object.keys(aggMetaTime).sort((a,b) => aggMetaTime[a].sortIdx - aggMetaTime[b].sortIdx);

                if(charts.metaArr) charts.metaArr.destroy();
                charts.metaArr = new Chart(document.getElementById('chartMetaVsArr'), {
                    type: 'bar',
                    data: {
                        labels: labelsMeta,
                        datasets: [
                            { label: 'Arrecadado', data: labelsMeta.map(l => aggMetaTime[l].arrecadado), backgroundColor: '#8b5cf6', borderRadius: 4 },
                            { label: 'Meta', type: 'line', data: labelsMeta.map(l => aggMetaTime[l].meta), borderColor: '#f59e0b', borderDash: [5,5], borderWidth: 2, fill: false }
                        ]
                    },
                    options: { plugins: { datalabels: { align: 'top', anchor: 'end', display: (ctx) => ctx.datasetIndex === 0 } } }
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
                const mesesOrdemMap = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
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
                    options: { plugins: { datalabels: { formatter: v => v > 0 ? v.toFixed(0) + '%' : '' } } }
                });
            }

            if (activePanelId === 'operadores' || activePanelId === 'quartil') {
                let filteredOperators = operadores.filter(o => {
                    if (!selEq.some(eq => opMatches(o.operacao, eq))) return false;
                    
                    if (o.mes) {
                        const dt = new Date(o.mes);
                        if (!isNaN(dt)) {
                            const mName = normalizeMonth(o.mes);
                            const year = dt.getUTCFullYear().toString();
                            if (!selMes.includes(mName)) return false;
                            if (!selAno.includes(year)) return false;
                        }
                    } else return false;

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
                        if(!aggOps[op.agente]) {
                            aggOps[op.agente] = {
                                agente: op.agente, operacao: op.operacao,
                                ho: 0, metaHO: 0, cpc: 0, promessa: 0,
                                qSum: 0, qCount: 0, tLog: 0, pausa: 0,
                                quartis: []
                            };
                        }
                        aggOps[op.agente].ho += (op.ho || 0);
                        const inferredMetaHO = (op.ho && op.alcance_ho && op.alcance_ho > 0) ? (op.ho / op.alcance_ho) : 0;
                        aggOps[op.agente].metaHO += inferredMetaHO;
                        
                        aggOps[op.agente].cpc += (op.cpc || 0);
                        aggOps[op.agente].promessa += (op.promessa || 0);
                        if(op.qualidade) { aggOps[op.agente].qSum += op.qualidade; aggOps[op.agente].qCount++; }
                        aggOps[op.agente].tLog += timeToSec(op.tempo_logado);
                        aggOps[op.agente].pausa += timeToSec(op.pausa);
                        if(op.quartil_ho) aggOps[op.agente].quartis.push(op.quartil_ho);
                    });

                    const opGrid = document.getElementById('operatorsGrid');
                    if (opGrid) {
                        opGrid.innerHTML = '';
                        Object.values(aggOps).sort((a,b) => b.ho - a.ho).slice(0, 100).forEach(op => {
                            let mostFreqQ = '0';
                            if(op.quartis.length > 0) {
                                const map = {};
                                op.quartis.forEach(q => map[q] = (map[q] || 0) + 1);
                                mostFreqQ = Object.keys(map).reduce((a, b) => map[a] > map[b] ? a : b);
                            }
                            
                            let qNum = mostFreqQ.includes('1') ? '1' : mostFreqQ.includes('2') ? '2' : mostFreqQ.includes('3') ? '3' : mostFreqQ.includes('4') ? '4' : '0';
                            const badgeCls = `badge-${qNum}q`;
                            const displayQ = qNum !== '0' ? `${qNum}º Q` : '-';
                            
                            const alcHO = op.metaHO > 0 ? op.ho / op.metaHO : 0;
                            const avgQual = op.qCount > 0 ? op.qSum / op.qCount : 0;

                            opGrid.innerHTML += `
                                <div class="op-card">
                                    <div class="op-quartil-badge ${badgeCls}">${displayQ}</div>
                                    <div class="op-header">
                                        <div class="op-avatar" style="background: var(--bg-secondary); border: 1px solid var(--border);">${op.agente ? op.agente.charAt(0) : 'U'}</div>
                                        <div><div class="op-name">${op.agente}</div><div class="op-team">${op.operacao || 'Sem Equipe'}</div></div>
                                    </div>
                                    <div class="op-metrics">
                                        <div class="op-metric"><div class="metric-value">${formatPct(alcHO)}</div><div class="metric-label">Alcance H.O</div></div>
                                        <div class="op-metric"><div class="metric-value">${formatPct(avgQual)}</div><div class="metric-label">Qualidade</div></div>
                                        <div class="op-metric"><div class="metric-value">${secToTime(op.tLog)}</div><div class="metric-label">T. Logado</div></div>
                                        <div class="op-metric"><div class="metric-value">${formatNum(op.cpc)}</div><div class="metric-label">CPC</div></div>
                                        <div class="op-metric"><div class="metric-value">${formatNum(op.promessa)}</div><div class="metric-label">Promessas</div></div>
                                        <div class="op-metric"><div class="metric-value">${secToTime(op.pausa)}</div><div class="metric-label">Pausa</div></div>
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
                        arr.forEach((item, idx) => {
                            container.innerHTML += `
                                <div class="q-card ${idx < 3 ? 'highlight' : ''}" style="${idx < 3 && colorClass === 'badge-1q' ? 'border-color: rgba(16,185,129,0.3); animation: pulse-glow-green 2s infinite;' : ''}">
                                    <div class="q-rank" style="background: var(--bg-secondary); border: 1px solid var(--border);">#${idx+1}</div>
                                    <div class="q-info">
                                        <div class="q-name">${item[0]}</div>
                                        <div class="q-count" style="color: ${colorClass === 'badge-1q' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}"><i class="${iconClass}"></i> ${item[1].count} vezes</div>
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

        setTimeout(renderCharts, 200);
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
