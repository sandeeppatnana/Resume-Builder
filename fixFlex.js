const fs = require('fs');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove dangerous break-words which causes vertical single-character squishing
    content = content.replace(/break-words/g, '');

    // 2. Replace flex-1 (basis 0%) with flex-auto (basis auto) to prevent squishing below intrinsic word size
    content = content.replace(/className="flex-1 min-w-0"/g, 'className="flex-auto min-w-0"');
    content = content.replace(/className="min-w-0 flex-1"/g, 'className="min-w-0 flex-auto"');
    content = content.replace(/className="flex-1"/g, 'className="flex-auto min-w-0"');

    // Fix multiple spaces
    content = content.replace(/  +/g, ' ');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${filePath}`);
}

processFile('src/UniversalTemplate.jsx');
processFile('src/App.jsx');
