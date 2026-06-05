const { DASHBOARD_DATA } = require('./data_v2.js');
const eqMeta = [...new Set((DASHBOARD_DATA.unifiedMeta || []).map(d => d.carteira).filter(Boolean))].sort();
const eqOper = [...new Set((DASHBOARD_DATA.operadores || []).map(d => d.operacao).filter(Boolean))].sort();
console.log('META (unifiedMeta.carteira):', eqMeta);
console.log('OPER (operadores.operacao):', eqOper);
