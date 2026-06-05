const { DASHBOARD_DATA } = require('./data_v2.js');

let opsFilter = (DASHBOARD_DATA.operadores || []).filter(o => {
    return true; // assume all years and months
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

let carteirasList = [];
const selEq = []; // Empty selection

Object.keys(grouped).forEach(opName => {
    if (selEq.length > 0 && !selEq.some(eq => {
        return opName.toLowerCase() === eq.toLowerCase() || opName.toLowerCase().includes(eq.toLowerCase()) || eq.toLowerCase().includes(opName.toLowerCase());
    })) return;
    
    const group = grouped[opName];
    const groupValidHO = group.filter(o => getHOValDisp(o.ho) > 0);
    const groupValidProm = group.filter(o => getPromValDisp(o.promessa) > 0);
    
    if (groupValidHO.length === 0) return; // <---- WAIT!
    
    // ...
    carteirasList.push(opName);
});

console.log('Valid operations with HO > 0:', carteirasList);
