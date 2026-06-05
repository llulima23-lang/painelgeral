const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('file:///C:/Users/sup.luciana/Desktop/AntiGravity/PAINEL GERAL/index.html', { waitUntil: 'networkidle0' });
    
    // Fill login
    await page.type('#loginInput', '1926');
    await page.click('#loginBtn');
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => document.querySelector('li[data-panel="dispersao"]').click());
    await new Promise(r => setTimeout(r, 1000));

    // Get the first item
    try {
        const item = await page.evaluate(() => {
            const unique = new Set();
            DASHBOARD_DATA.operadores.forEach(o => unique.add(o.ano + '-' + o.mes));
            return Array.from(unique);
        });
        
        console.log('FIRST OPERADOR:', item);

        await page.screenshot({ path: 'C:/Users/sup.luciana/.gemini/antigravity-ide/brain/cebbb44b-2b0c-4ac2-924f-e237abb6f3aa/artifacts/screenshot.png', fullPage: true });
        console.log('SCREENSHOT SAVED');

    } catch (e) { console.error(e); }
    await browser.close();
})();
