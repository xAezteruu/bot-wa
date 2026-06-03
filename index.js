import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import config from './config.js';
import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let handleConnection = (await import('./src/events/connection.js')).default;
let handleMessage = (await import('./src/events/message.js')).default;

// Watcher menggunakan path absolut agar selalu benar
const eventsDir = path.join(__dirname, 'src/events');
const commandsDir = path.join(__dirname, 'src/commands');

chokidar.watch(eventsDir, { ignoreInitial: true }).on('all', async (filePath) => {
    console.log(`\n[WATCHER] Event diubah: ${path.basename(filePath)}, me-reload events...`);
    try {
        handleConnection = (await import(`./src/events/connection.js?update=${Date.now()}`)).default;
        handleMessage = (await import(`./src/events/message.js?update=${Date.now()}`)).default;
        console.log('[WATCHER] Events berhasil di-reload.');
    } catch (err) {
        console.error('[WATCHER] Gagal me-reload events:', err.message);
    }
});

chokidar.watch(commandsDir, { ignoreInitial: true }).on('all', async (filePath) => {
    console.log(`\n[WATCHER] Command diubah: ${path.basename(filePath)}, me-reload commands...`);
    try {
        handleMessage = (await import(`./src/events/message.js?update=${Date.now()}`)).default;
        console.log('[WATCHER] Commands berhasil di-reload.');
    } catch (err) {
        console.error('[WATCHER] Gagal me-reload commands:', err.message);
    }
});

/*chokidar.watch(commandsDir, { ignoreInitial: true }).on('add', async (filePath) => {
    console.log(`\n[WATCHER] Command baru: ${path.basename(filePath)}, me-reload commands...`);
    try {
        handleMessage = (await import(`./src/events/message.js?update=${Date.now()}`)).default;
        console.log('[WATCHER] Commands berhasil di-reload.');
    } catch (err) {
        console.error('[WATCHER] Gagal me-reload commands:', err.message);
    }
});*/

let pairingCodeRequested = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan WA v${version.join('.')}, isLatest: ${isLatest}`);

    let connected = false;

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    // Fitur Pairing Code
    if (!sock.authState.creds.registered && config.phoneNumber && !pairingCodeRequested) {
        pairingCodeRequested = true;
        setTimeout(async () => {
            if (connected) {
                console.log('[INFO] Sudah terkoneksi, melewati permintaan kode pairing.');
                return;
            }
            try {
                const phoneNumber = config.phoneNumber.replace(/[^0-9]/g, '');
                console.log(`[WAIT] Meminta kode pairing untuk nomor: ${phoneNumber}...`);
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n=================================\n[KEY] KODE PAIRING ANDA: ${code}\n=================================\n`);
            } catch (err) {
                console.error('[WARN] Gagal meminta kode pairing:', err?.message || err);
                pairingCodeRequested = false;
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') {
            connected = true;
        }
        handleConnection(update, startBot, DisconnectReason);
    });

    sock.ev.on('messages.upsert', async (msg) => {
        if (msg.type === 'notify') {
            await handleMessage(sock, msg);
        }
    });
}

startBot();
