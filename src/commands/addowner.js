import { isOwner, getFileOwners, saveFileOwners, isSameJid } from '../utils/sender.js';
import config from '../../config.js';

export default {
    name: 'addowner',
    category: 'CMD OWNER',
    description: 'Menambahkan owner (tag atau nomor)',
    execute: async (sock, msg, args) => {
        if (!isOwner(msg)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Perintah ini hanya bisa digunakan oleh Owner!' }, { quoted: msg });
            return;
        }

        const owners = getFileOwners();
        let targetId = null;
        let displayName = '';

        // Metode 1: Via mention/tag (@user)
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentionedJid && mentionedJid.length > 0) {
            targetId = mentionedJid[0];
            displayName = targetId.split('@')[0];
        }
        // Metode 2: Via argumen (nomor telepon atau LID)
        else if (args.length > 0) {
            let input = args[0].trim();
            if (input.startsWith('@')) {
                input = input.slice(1);
            }
            if (input.includes('@')) {
                targetId = input;
            } else if (/^\d+$/.test(input)) {
                targetId = `${input}@s.whatsapp.net`;
            } else {
                const cleanLid = input.startsWith('lid:') ? input : `lid:${input}`;
                targetId = `${cleanLid}@lid`;
            }
            displayName = targetId.split('@')[0];
        }

        if (!targetId) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: 'Gunakan salah satu format:\n' +
                      '1. Tag user: .addowner @user\n' +
                      '2. Nomor/LID: .addowner 628123456789 atau .addowner lid:xxxxx'
            }, { quoted: msg });
            return;
        }

        const isAlreadyOwner = owners.some(id => isSameJid(id, targetId)) || 
                              config.owners.some(id => isSameJid(id, targetId));

        if (isAlreadyOwner) {
            await sock.sendMessage(msg.key.remoteJid, { text: `[INFO] ${displayName} sudah menjadi owner.` }, { quoted: msg });
            return;
        }

        owners.push(targetId);
        saveFileOwners(owners);

        await sock.sendMessage(msg.key.remoteJid, { text: `[SUCCESS] Berhasil menambahkan ${displayName} ke daftar owner.` }, { quoted: msg });
    }
};
