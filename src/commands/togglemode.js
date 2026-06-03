import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import { isOwner } from '../utils/sender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modeFile = path.join(__dirname, '../data/mode.json');

export default {
    name: 'togglemode',
    category: 'CMD OWNER',
    description: 'Mengubah mode bot (Public / Self)',
    execute: async (sock, msg, args) => {
        if (!isOwner(msg)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Perintah ini hanya bisa digunakan oleh Owner!' }, { quoted: msg });
            return;
        }

        let botMode = 'public';
        if (fs.existsSync(modeFile)) {
            botMode = JSON.parse(fs.readFileSync(modeFile, 'utf8')).mode;
        }

        const newMode = botMode === 'public' ? 'self' : 'public';
        fs.writeFileSync(modeFile, JSON.stringify({ mode: newMode }, null, 2));

        const status = newMode === 'public' 
            ? 'Bot sekarang dalam mode *Public* (Semua orang bisa menggunakan command).' 
            : 'Bot sekarang dalam mode *Self* (Hanya Owner yang bisa menggunakan command).';

        await sock.sendMessage(msg.key.remoteJid, { text: `[SUCCESS] ${status}` }, { quoted: msg });
    }
};
