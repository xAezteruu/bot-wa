import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'rvo',
    category: 'CMD TOOLS',
    description: 'Mengambil dan menampilkan kembali pesan View Once (Sekali Lihat)',
    execute: async (sock, msg, args) => {
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            await sock.sendMessage(msg.key.remoteJid, { text: '[INFO] Balas (reply) pesan View Once dengan perintah .rvo' }, { quoted: msg });
            return;
        }

        // Cari media view once dari berbagai kemungkinan struktur pesan
        let mediaMsg = null;

        // Struktur 1: viewOnceMessageV2 > message > imageMessage/videoMessage
        if (quotedMsg.viewOnceMessageV2?.message) {
            mediaMsg = quotedMsg.viewOnceMessageV2.message;
        }
        // Struktur 2: viewOnceMessageV2Extension > message
        else if (quotedMsg.viewOnceMessageV2Extension?.message) {
            mediaMsg = quotedMsg.viewOnceMessageV2Extension.message;
        }
        // Struktur 3: viewOnceMessage > message
        else if (quotedMsg.viewOnceMessage?.message) {
            mediaMsg = quotedMsg.viewOnceMessage.message;
        }
        // Struktur 4: imageMessage/videoMessage langsung dengan flag viewOnce = true
        else if (quotedMsg.imageMessage?.viewOnce) {
            mediaMsg = { imageMessage: quotedMsg.imageMessage };
        }
        else if (quotedMsg.videoMessage?.viewOnce) {
            mediaMsg = { videoMessage: quotedMsg.videoMessage };
        }

        if (!mediaMsg) {
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Pesan yang dibalas bukan pesan View Once!' }, { quoted: msg });
            return;
        }

        const mediaType = Object.keys(mediaMsg)[0]; // imageMessage, videoMessage, dll.
        
        try {
            // Buat struktur message palsu yang bisa di-download oleh Baileys
            const stanzaId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;
            const participant = msg.message.extendedTextMessage?.contextInfo?.participant;

            const fakeMsg = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    id: stanzaId,
                    participant: participant
                },
                message: mediaMsg
            };
            
            const buffer = await downloadMediaMessage(
                fakeMsg,
                'buffer',
                {},
                { 
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );
            
            const caption = mediaMsg[mediaType]?.caption || '';
            
            if (mediaType === 'imageMessage') {
                await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption: caption || '[RVO] View Once Image' }, { quoted: msg });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(msg.key.remoteJid, { video: buffer, caption: caption || '[RVO] View Once Video' }, { quoted: msg });
            } else if (mediaType === 'audioMessage') {
                await sock.sendMessage(msg.key.remoteJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Tipe media tidak didukung.' }, { quoted: msg });
            }
            
        } catch (error) {
            console.error('Error in rvo:', error?.message || error);
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Gagal mengambil media View Once. Kemungkinan media sudah expired.' }, { quoted: msg });
        }
    }
};
