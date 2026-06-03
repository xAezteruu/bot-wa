import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import { getFileOwners } from '../utils/sender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'listowner',
    category: 'CMD OWNER',
    description: 'Menampilkan daftar owner bot',
    execute: async (sock, msg, args) => {
        let text = '╭─[ DAFTAR OWNER ]─❖\n';
        const mentions = [];
        
        let i = 1;
        
        const formatOwner = (id) => {
            let normalizedJid = id;
            if (!id.includes('@')) {
                if (/^\d+$/.test(id)) {
                    normalizedJid = `${id}@s.whatsapp.net`;
                } else {
                    const cleanLid = id.startsWith('lid:') ? id : `lid:${id}`;
                    normalizedJid = `${cleanLid}@lid`;
                }
            }
            mentions.push(normalizedJid);
            return `@${normalizedJid.split('@')[0]}`;
        };

        // Tambahkan dari config
        for (const id of config.owners) {
            text += `│ ${i}. ${formatOwner(id)} (Utama)\n`;
            i++;
        }

        // Tambahkan dari file
        const owners = getFileOwners();
        for (const id of owners) {
            text += `│ ${i}. ${formatOwner(id)}\n`;
            i++;
        }
        
        if (i === 1) {
            text += '│ Tidak ada owner yang terdaftar.\n';
        }
        
        text += '╰────────────────❖';
        
        await sock.sendMessage(msg.key.remoteJid, { 
            text: text,
            contextInfo: { mentionedJid: mentions }
        }, { quoted: msg });
    }
};
