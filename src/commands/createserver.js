import axios from 'axios';
import config from '../../config.js';

export default {
    name: 'createserver',
    category: 'CMD OWNER',
    description: 'Membuat instance server baru (Contoh penggunaan: .createserver <user_id> <nama_server>)',
    execute: async (sock, msg, args) => {
        if (args.length < 2) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Format salah! Gunakan: .createserver <user_id> <nama_server>' }, { quoted: msg });
            return;
        }

        const userId = args[0];
        const serverName = args.slice(1).join(" ");
        
        const url = `${config.pterodactyl.url}/api/application/servers`;
        const headers = { 
            'Authorization': `Bearer ${config.pterodactyl.appKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Note: Payload di bawah ini adalah contoh minimalis. 
        // Biasanya Pterodactyl butuh alokasi, nest_id, egg_id, docker_image, dll.
        // Silakan disesuaikan dengan environment Anda.
        const payload = {
            name: serverName,
            user: parseInt(userId),
            egg: 1, // Ganti dengan egg_id yang sesuai
            docker_image: "ghcr.io/pterodactyl/yolks:java_17", // Sesuaikan image
            startup: "java -jar server.jar", // Sesuaikan startup command
            environment: {
                SERVER_JARFILE: "server.jar"
            },
            limits: {
                memory: 1024,
                swap: 0,
                disk: 1024,
                io: 500,
                cpu: 100
            },
            feature_limits: {
                databases: 1,
                backups: 1
            },
            allocation: {
                default: 1 // Ganti dengan allocation ID yang valid
            }
        };

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '[INFO] Memproses pembuatan server...' }, { quoted: msg });

            const response = await axios.post(url, payload, { headers });
            const server = response.data.attributes;

            let text = '*[SUCCESS] Server Berhasil Dibuat*\n\n';
            text += `*ID*: ${server.identifier}\n`;
            text += `*Nama*: ${server.name}\n`;
            text += `*Node*: ${server.node}\n`;

            await sock.sendMessage(msg.key.remoteJid, { text: text }, { quoted: msg });

        } catch (error) {
            console.error("Error createserver:", error?.response?.data || error.message);
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Gagal membuat server. Pastikan payload (egg, image, allocation, user) valid. Cek console untuk detail error.' }, { quoted: msg });
        }
    }
};
