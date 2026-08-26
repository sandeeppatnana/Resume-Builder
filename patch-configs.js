const fs = require('fs');
let file = fs.readFileSync('src/UniversalTemplate.jsx', 'utf8');

// Replace left div for 'single' layout and 'two-column-left'
file = file.replace(/<div className="flex-auto min-w-0">\s*<h1 className={\`\$\{config\.styles\.name\}\s*\`}>\{p\.fullName\}<\/h1>\s*\{p\.title && <p className={\`\$\{config\.styles\.title\}\s*\`}>\{p\.title\}<\/p>\}\s*<\/div>/g,
    `<div className="flex-auto min-w-[40%] max-w-full">
                                <h1 className={\`\${config.styles.name} break-words\`}>{p.fullName}</h1>
                                {p.title && <p className={\`\${config.styles.title} break-words\`}>{p.title}</p>}
                            </div>`);

// Replace Two-column-right div
file = file.replace(/<div className="w-full min-w-0">\s*<h1 className={\`\$\{config\.styles\.name\}\s*\`}>\{p\.fullName\}<\/h1>\s*\{p\.title && <p className={\`\$\{config\.styles\.title\}\s*\`}>\{p\.title\}<\/p>\}\s*<\/div>/g,
    `<div className="w-full min-w-[40%] max-w-full">
                                <h1 className={\`\${config.styles.name} break-words\`}>{p.fullName}</h1>
                                {p.title && <p className={\`\${config.styles.title} break-words\`}>{p.title}</p>}
                            </div>`);

// Replace Contact lines in various locations
file = file.replace(/<ContactStack p={p} className={\`mt-2 shrink-0 \$\{config\.styles\.contactArea\}\`} \/>/g,
    `<ContactStack p={p} className={\`mt-2 shrink \${config.styles.contactArea || ''}\`} />`);

// Very careful escape replacement for single layout contact line
file = file.replace(/<ContactLine p={p} className={\`mt-1.5 shrink-0 \$\{config\.styles\.text\} min-w-0 flex-wrap\`} \/>/g,
    `<ContactLine p={p} className={\`mt-1.5 shrink flex-wrap \${config.styles.contactArea || ''} \${config.styles.text}\`} />`);

// two column left
file = file.replace(/<ContactStack p={p} className={\`shrink-0 \$\{config\.styles\.contactArea\}\`} \/>/g,
    `<ContactStack p={p} className={\`shrink min-w-[30%] \${config.styles.contactArea || ''}\`} />`);

// two column right
file = file.replace(/<ContactLine p={p} className={\`mt-2 \$\{config\.styles\.text\} justify-center w-full min-w-0 flex-wrap\`} \/>/g,
    `<ContactLine p={p} className={\`mt-2 \${config.styles.text} justify-center w-full shrink flex-wrap\`} />`);


// Config replacements explicitly
file = file.replace(/headerWrapper: 'flex justify-between items-end mb-4',/g, "headerWrapper: 'flex flex-wrap justify-between items-end gap-x-4 gap-y-2 mb-4',\n        contactArea: 'justify-end text-right',");
file = file.replace(/headerWrapper: 'flex justify-between items-baseline mb-3',/g, "headerWrapper: 'flex flex-wrap justify-between items-baseline gap-x-4 gap-y-2 mb-3',\n        contactArea: 'justify-end text-right',");
file = file.replace(/headerWrapper: 'text-left mb-4 flex flex-col items-start',/g, "headerWrapper: 'text-left mb-4 flex flex-col items-start',\n        contactArea: 'justify-start text-left',");
file = file.replace(/headerWrapper: 'text-center mb-4',/g, "headerWrapper: 'text-center mb-4',\n        contactArea: 'justify-center text-center',");
file = file.replace(/headerWrapper: 'text-center mb-5',/g, "headerWrapper: 'text-center mb-5',\n        contactArea: 'justify-center text-center',");
file = file.replace(/headerWrapper: 'mb-6 text-center',/g, "headerWrapper: 'mb-6 text-center',\n        contactArea: 'justify-center text-center',");


fs.writeFileSync('src/UniversalTemplate.jsx', file);
console.log("Patched UniversalTemplate successfully!");
