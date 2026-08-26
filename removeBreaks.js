const fs = require('fs');

function processFile(filePath, isGlobal) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Strip hardcoded break-inside-avoid classes to allow natural content wrapping
    content = content.replace(/break-inside-avoid/g, '');
    content = content.replace(/className="([^"]*?)\s+"/g, 'className="$1"');

    if (isGlobal) {
        // Add break-after-avoid to the heading configs in UniversalTemplate
        content = content.replace(/heading: '([^']+)'/g, 'heading: \'$1 break-after-avoid\'');
        // Add break-after-avoid to the item headers so they stick to their bodies
        content = content.replace(/itemHeader: '([^']+)'/g, 'itemHeader: \'$1 break-after-avoid\'');
    } else {
        // Add break-after-avoid to App.jsx legacy headers
        // ResumeATS, ResumeModern, ResumeMinimal, ResumeProfessional headers (h2)
        content = content.replace(/<h2 className="([^"]+)"/g, (match, classes) => {
            if (classes.includes('break-after-avoid')) return match;
            return `<h2 className="${classes} break-after-avoid"`;
        });

        // Add break-after-avoid to job titles / item headers in App.jsx
        // Pattern: <div className="flex justify-between items-baseline">
        content = content.replace(/className="flex justify-between items-baseline"/g, 'className="flex justify-between items-baseline break-after-avoid"');
    }

    // Final whitespace cleanup in classNames
    content = content.replace(/className="([^"]*)\s\s+([^"]*)"/g, 'className="$1 $2"');
    content = content.replace(/className="([^"]*)\s"/g, 'className="$1"');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${filePath}`);
}

processFile('src/UniversalTemplate.jsx', true);
processFile('src/App.jsx', false);
