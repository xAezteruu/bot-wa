import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'menu',
    category: 'CMD TOOLS',
    description: 'Menampilkan daftar perintah yang tersedia',
    execute: async (sock, msg, args) => {
        const prefix = config.prefix[0];
        const botName = "Renteru";
        const devName = "Aezteru";
        const version = "v1.0";
        
        let mode = "Public";
        const modeFile = path.join(__dirname, '../data/mode.json');
        if (fs.existsSync(modeFile)) {
            const currentMode = JSON.parse(fs.readFileSync(modeFile, 'utf8')).mode;
            mode = currentMode === 'self' ? 'Self' : 'Public';
        }

        let menuText = `╭─ ✦ Info Bot ✦ ─╮\n`;
        menuText += `⊛ NAME      : ${botName}\n`;
        menuText += `⊛ DEV       : ${devName}\n`;
        menuText += `⊛ VERSION   : ${version}\n`;
        menuText += `⊛ MODE      : ${mode}\n`;
        menuText += `╰────────────────╯\n\n`;

        try {
            const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
            const categories = {};

            // Mengelompokkan commands berdasarkan category
            for (const file of files) {
                const commandModule = await import(path.join('file://', __dirname, file));
                const command = commandModule.default;
                
                if (command && command.name) {
                    const cat = command.category || 'CMD LAINNYA';
                    if (!categories[cat]) categories[cat] = [];
                    categories[cat].push(command.name);
                }
            }

            // Merender setiap kategori
            for (const [category, cmds] of Object.entries(categories)) {
                menuText += `╭─[ ${category} ]─⬣\n`;
                for (const cmd of cmds) {
                    menuText += `│ ⊛ ${prefix}${cmd}\n`;
                }
                menuText += `╰─────────────────⬣\n\n`;
            }

        } catch (err) {
            console.error('Gagal membaca commands untuk menu:', err);
            menuText += 'Terjadi kesalahan saat memuat menu.\n\n';
        }

        menuText += `© 2026 ${botName} ${version} - ${devName}`;

        await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
    }
};
