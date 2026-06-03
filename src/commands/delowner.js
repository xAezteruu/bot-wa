import { isOwner, getFileOwners, saveFileOwners, isSameJid } from '../utils/sender.js';

export default {
    name: 'delowner',
    category: 'CMD OWNER',
    description: 'Menghapus owner (tag atau nomor)',
    execute: async (sock, msg, args) => {
        if (!isOwner(msg)) {
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Perintah ini hanya bisa digunakan oleh Owner!' }, { quoted: msg });
            return;
        }

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
                      '1. Tag user: .delowner @user\n' +
                      '2. Nomor/LID: .delowner 628123456789 atau .delowner lid:xxxxx'
            }, { quoted: msg });
            return;
        }

        const owners = getFileOwners();
        const exists = owners.some(id => isSameJid(id, targetId));
        if (!exists) {
            await sock.sendMessage(msg.key.remoteJid, { text: `[INFO] ${displayName} tidak ada di daftar owner.` }, { quoted: msg });
            return;
        }

        const updated = owners.filter(id => !isSameJid(id, targetId));
        saveFileOwners(updated);

        await sock.sendMessage(msg.key.remoteJid, { text: `[SUCCESS] Berhasil menghapus ${displayName} dari daftar owner.` }, { quoted: msg });
    }
};
