const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(/<div key=\{([^}]+)\} className="([^"]*?mb-[^"]*?)"/g, (match, key, cls) => {
    if (cls.includes('break-inside-avoid')) return match;
    return `<div key={${key}} className="${cls} break-inside-avoid"`;
});

c = c.replace(/<p key=\{([^}]+)\} className="([^"]*?mb-[^"]*?)"/g, (match, key, cls) => {
    if (cls.includes('break-inside-avoid')) return match;
    return `<p key={${key}} className="${cls} break-inside-avoid"`;
});

c = c.replace(/<section className=\{styles\.wrapper\} style=\{style\}>/g, '<section className={styles.wrapper + " break-inside-avoid"} style={style}>');

let printStylesDef = `function PrintStyles() {
  return (
    <style>{\`
      @media print {
        @page { margin: 16mm 18mm; }
        #resume-print-page { padding: 0 !important; width: 100% !important; min-height: auto !important; }
      }
    \`}</style>
  );
}
`;
if (!c.includes('function PrintStyles')) {
    c = c.replace('function PreviewPanel', printStylesDef + '\nfunction PreviewPanel');
    c = c.replace(/<div className="resume-preview-layout"[^>]+>\s*<div[^>]*>/, '$&\n            <PrintStyles />');
}

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('Successfully updated!');
