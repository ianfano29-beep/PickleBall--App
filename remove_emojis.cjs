const fs = require('fs');
const path = require('path');

const emojis = ['🏆', '📍', '👥', '🔴', '🟡', '✅', '❌', '💡', '🎯', '⏳'];

function removeEmojis(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            removeEmojis(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            for (const emoji of emojis) {
                content = content.split(emoji + ' ').join('');
                content = content.split(' ' + emoji).join('');
                content = content.split(emoji).join('');
            }
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated ' + fullPath);
            }
        }
    }
}

removeEmojis(path.join(__dirname, 'src'));
