const fs = require('fs');
let file = fs.readFileSync('src/UniversalTemplate.jsx', 'utf8');

file = file.replace(/<div className=\{config\.styles\.itemSubHeader\}>\s*<span>\{c\.organization\}<\/span>\s*<\/div>\s*<\/div>/g,
    `<div className={config.styles.itemSubHeader}>
                    <span>{c.organization}</span>
                </div>
                {c.url && (
                    <div className={\`\${config.styles.text} mt-0.5\`}><a href={c.url.match(/^https?:\\/\\//) ? c.url : \`https://\${c.url}\`} target="_blank" rel="noreferrer" className="underline hover:opacity-80 break-all">{c.url}</a></div>
                )}
            </div>`);

fs.writeFileSync('src/UniversalTemplate.jsx', file);
console.log("Patched!");
