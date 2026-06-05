const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "dangerously"
});

const window = dom.window;
const document = window.document;

window.onerror = function(msg, url, line, col, error) {
   console.log("WINDOW ERROR:", msg, line, col, error);
};
window.console.error = function(...args) {
    console.log("CONSOLE ERROR:", ...args);
};

window.Chart = class Chart { constructor() { this.destroy = () => {}; } static register() {} };
window.Chart.defaults = { font: {}, plugins: { tooltip: {}, datalabels: {} }, scale: { grid: {} } };
window.ChartDataLabels = {};

const dataScript = fs.readFileSync('data_v2.js', 'utf-8');
window.eval(dataScript.replace('const DASHBOARD_DATA =', 'window.DASHBOARD_DATA ='));

const appScript = fs.readFileSync('app.js', 'utf-8');
const syncAppScript = appScript.replace('setTimeout(() => {', '(() => {').replace('}, 300);', '})();');

try {
    window.eval(syncAppScript);
    
    const event = document.createEvent('Event');
    event.initEvent('DOMContentLoaded', true, true);
    document.dispatchEvent(event);

    document.getElementById('loginInput').value = '1926';
    document.getElementById('loginBtn').click();

    // Click through all nav-items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.click();
    });

} catch (e) {
    console.error("TRYCATCH ERROR:", e);
}
