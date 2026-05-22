const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

const dir = path.join(__dirname, 'frontend/src');

walkDir(dir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let originalContent = content;
        
        // Gradients
        content = content.replace(/from-orange-500 to-red-600/g, 'from-blue-600 to-cyan-500');
        content = content.replace(/from-orange-600 to-red-900/g, 'from-blue-900 to-cyan-900');
        
        // Colors
        content = content.replace(/orange-500/g, 'blue-500');
        content = content.replace(/orange-600/g, 'blue-600');
        content = content.replace(/orange-400/g, 'blue-400');
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`Updated ${filePath}`);
        }
    }
});
