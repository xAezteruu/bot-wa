import axios from 'axios';
import config from '../../config.js';

export default {
    name: 'manageserver',
    category: 'CMD OWNER',
    description: 'Mengontrol state server (start, stop, restart, kill). Penggunaan: .manageserver <server_id> <action>',
    execute: async (sock, msg, args) => {
        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Format salah! Gunakan: .manageserver <server_id> <start|stop|restart|kill>' }, { quoted: msg });
            return;
        }

        const serverId = args[0];
        const action = args[1].toLowerCase();
        const validActions = ['start', 'stop', 'restart', 'kill'];

        if (!validActions.includes(action)) {
            await sock.sendMessage(msg.key.remoteJid, { text: `Action tidak valid! Pilih salah satu: ${validActions.join(', ')}` }, { quoted: msg });
            return;
        }
        
        const url = `${config.pterodactyl.url}/api/client/servers/${serverId}/power`;
        const headers = { 
            'Authorization': `Bearer ${config.pterodactyl.clientKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const payload = {
            signal: action
        };

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: `[INFO] Sedang memproses: ${action.toUpperCase()} pada server ${serverId}...` }, { quoted: msg });

            await axios.post(url, payload, { headers });

            await sock.sendMessage(msg.key.remoteJid, { text: `[SUCCESS] Berhasil mengirim perintah *${action}* ke server ${serverId}.` }, { quoted: msg });

        } catch (error) {
            console.error("Error manageserver:", error?.response?.data || error.message);
            await sock.sendMessage(msg.key.remoteJid, { text: `[ERROR] Gagal mengelola server. Pastikan Server ID benar dan kamu memiliki akses.` }, { quoted: msg });
        }
    }
};
