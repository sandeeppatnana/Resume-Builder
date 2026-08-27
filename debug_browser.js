const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    page.on('requestfailed', req => console.log('NETWORK ERROR:', req.url(), req.failure()?.errorText));

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 10000 });
        console.log("Page loaded successfully.");

        // Check if there is any text like "Initializing Workspace" or "stuck"
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        if (bodyHTML.includes("Initializing")) {
            console.log("DOM state contains Initialize text.");
        }

        // Evaluate if loaded state is mounted
        console.log("App Screen Check:", await page.evaluate(() => {
            const root = document.getElementById("root");
            return root ? root.innerHTML.substring(0, 500) : "No root found";
        }));

    } catch (err) {
        console.error("Script failed:", err);
    } finally {
        await browser.close();
    }
})();
