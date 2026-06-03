import axios from 'axios';
import config from '../../config.js';

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(ms) {
    if (!ms) return '0s';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.join(' ') || '0s';
}

export default {
    name: 'listserver',
    category: 'CMD PTERO',
    description: 'Menampilkan daftar server dari Pterodactyl (Detail & Stats)',
    execute: async (sock, msg, args) => {
        const url = `${config.pterodactyl.url}/api/client`;
        const headers = { 
            'Authorization': `Bearer ${config.pterodactyl.clientKey}`,
            'Accept': 'application/vnd.pterodactyl.v1+json',
            'Content-Type': 'application/json'
        };

        try {
            await sock.sendMessage(msg.key.remoteJid, { text: '[INFO] Mengambil data server dan resource stats...' }, { quoted: msg });

            const listResponse = await axios.get(url, { headers });
            const servers = listResponse.data.data;

            if (servers.length === 0) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Tidak ada server yang ditemukan.' }, { quoted: msg });
                return;
            }

            const serverPromises = servers.map(async (server) => {
                const identifier = server.attributes.identifier;
                const detailUrl = `${config.pterodactyl.url}/api/client/servers/${identifier}`;
                const resourcesUrl = `${config.pterodactyl.url}/api/client/servers/${identifier}/resources`;

                let details = server.attributes;
                let stats = null;

                try {
                    const [detailRes, resourcesRes] = await Promise.all([
                        axios.get(detailUrl, { headers }),
                        axios.get(resourcesUrl, { headers })
                    ]);
                    details = detailRes.data.attributes;
                    stats = resourcesRes.data.attributes;
                } catch (err) {
                    console.error(`Gagal mengambil detail lengkap untuk server ${identifier}:`, err.message);
                    try {
                        const resourcesRes = await axios.get(resourcesUrl, { headers });
                        stats = resourcesRes.data.attributes;
                    } catch (e) {
                        console.error(`Gagal mengambil resource stats untuk server ${identifier}:`, e.message);
                    }
                }

                return {
                    identifier,
                    details,
                    stats
                };
            });

            const results = await Promise.all(serverPromises);

            let text = '*[LIST] Daftar Server (Detail & Stats)*\n\n';

            for (const item of results) {
                const det = item.details;
                const st = item.stats;

                const name = det.name || 'N/A';
                const id = item.identifier;
                const node = det.node || 'N/A';
                const desc = det.description || 'Tidak ada deskripsi.';
                const isOwner = det.server_owner ? 'Ya' : 'Tidak';
                const dockerImage = det.docker_image.split(":")[1] || 'N/A';
                            const state = st ? st.current_state : (det.status || 'unknown');
                let uptimeStr = 'N/A';
                let cpuStr = 'N/A';
                let ramStr = 'N/A';
                let diskStr = 'N/A';
                let networkStr = 'N/A';

                const ramLimit = det.limits?.memory;
                const cpuLimit = det.limits?.cpu;
                const diskLimit = det.limits?.disk;

                if (st && st.resources) {
                    const res = st.resources;
                    uptimeStr = formatUptime(res.uptime);
                    
                    const currentCpu = res.cpu_absolute !== undefined ? res.cpu_absolute.toFixed(2) : '0';
                    const limitCpu = cpuLimit === 0 || cpuLimit === null ? '∞' : `${cpuLimit}%`;
                    cpuStr = `${currentCpu}% / ${limitCpu}`;

                    const currentRam = formatBytes(res.memory_bytes);
                    const limitRam = ramLimit === 0 || ramLimit === null ? '∞' : `${ramLimit} MB`;
                    ramStr = `${currentRam} / ${limitRam}`;

                    const currentDisk = formatBytes(res.disk_bytes);
                    const limitDisk = diskLimit === 0 || diskLimit === null ? '∞' : `${diskLimit} MB`;
                    diskStr = `${currentDisk} / ${limitDisk}`;

                    const rx = formatBytes(res.network_rx_bytes);
                    const tx = formatBytes(res.network_tx_bytes);
                    networkStr = `RX: ${rx} | TX: ${tx}`;
                } else {
                    const limitCpu = cpuLimit === 0 || cpuLimit === null ? '∞' : `${cpuLimit}%`;
                    const limitRam = ramLimit === 0 || ramLimit === null ? '∞' : `${ramLimit} MB`;
                    const limitDisk = diskLimit === 0 || diskLimit === null ? '∞' : `${diskLimit} MB`;
                    
                    cpuStr = `N/A / ${limitCpu}`;
                    ramStr = `N/A / ${limitRam}`;
                    diskStr = `N/A / ${limitDisk}`;
                }

                const dbLimit = det.feature_limits?.databases ?? 'N/A';
                const allocLimit = det.feature_limits?.allocations ?? 'N/A';
                const backupLimit = det.feature_limits?.backups ?? 'N/A';

                text += `╭─[ SERVER: ${name} ]─❖\n`;
                text += `│ Owner: ${isOwner}\n`;
                text += `│ ID: ${id}\n`;
                text += `│ Node: ${node}\n`;
                text += `│ Deskripsi: ${desc}\n`;
                text += `│ Status: *${state.toUpperCase()}*\n`;
                text += `│ Uptime: ${uptimeStr}\n`;
                text += `│ Image: ${dockerImage}\n`;
                text += `│\n`;
                text += `│ Penggunaan Resource:\n`;
                text += `│  ├─ CPU: ${cpuStr}\n`;
                text += `│  ├─ RAM: ${ramStr}\n`;
                text += `│  ├─ Disk: ${diskStr}\n`;
                text += `│  └─ Jaringan: ${networkStr}\n`;
                text += `│\n`;
                text += `│ Limit Fitur:\n`;
                text += `│  ├─ Database: ${dbLimit}\n`;
                text += `│  ├─ Alokasi: ${allocLimit}\n`;
                text += `│  └─ Backup: ${backupLimit}\n`;
                text += `╰────────────────❖\n\n`;
            }

            await sock.sendMessage(msg.key.remoteJid, { text: text.trim() }, { quoted: msg });

        } catch (error) {
            console.error("Error listserver:", error?.response?.data || error.message);
            await sock.sendMessage(msg.key.remoteJid, { text: '[ERROR] Gagal mengambil daftar server. Cek log untuk detailnya.' }, { quoted: msg });
        }
    }
};
