const fs = require('fs');
const https = require('https');

https.get('https://restcountries.com/v3.1/all', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        // Build a unique and clean list
        const countries = [];
        json.forEach(c => {
            if (!c.idd || !c.idd.root) return;

            const pflags = c.idd.suffixes && c.idd.suffixes.length > 0 ? c.idd.suffixes : [""];
            pflags.forEach(suffix => {
                let code = (c.idd.root + suffix).trim();
                // Skip strange formats or duplicates
                if (!code || !code.startsWith('+')) return;
                countries.push({
                    name: c.name.common,
                    iso: c.cca2,
                    code: code,
                    flag: c.flag || ''
                });
            });
        });

        // Sort and remove distinct identical duplicates
        countries.sort((a, b) => a.name.localeCompare(b.name));

        const unique = [];
        const seen = new Set();
        countries.forEach(c => {
            const key = `${c.name}-${c.code}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(c);
            }
        });

        // Make sure we have a solid default set if the API has formatting weirdness
        if (!unique.find(c => c.iso === 'US')) unique.push({ name: 'United States', iso: 'US', code: '+1', flag: '🇺🇸' });
        if (!unique.find(c => c.iso === 'IN')) unique.push({ name: 'India', iso: 'IN', code: '+91', flag: '🇮🇳' });

        unique.sort((a, b) => a.name.localeCompare(b.name));

        fs.writeFileSync('src/countries.js', `export const COUNTRIES = ${JSON.stringify(unique, null, 2)};\n`);
        console.log("Wrote " + unique.length + " countries.");
    });
}).on('error', (err) => {
    console.error(err);
});
