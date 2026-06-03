import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import { isOwner } from '../utils/sender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, '../commands');
const commands = new Map();
const modeFile = path.join(__dirname, '../data/mode.json');

// Fungsi untuk load command secara dinamis
async function loadCommands() {
    try {
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        commands.clear();
        for (const file of files) {
            const commandModule = await import(path.join('file://', commandsPath, file) + `?update=${Date.now()}`);
            const command = commandModule.default;
            if (command && command.name) {
                commands.set(command.name, command);
            }
        }
        console.log(`Berhasil memuat ${commands.size} commands.`);
    } catch (err) {
        console.error('Gagal memuat commands:', err);
    }
}

// Panggil fungsi load saat file ini di-import
loadCommands();

export default async function handleMessage(sock, msg) {
    const m = msg.messages[0];
    console.dir(m, { depth: null })
    if (!m.message) return;
    
    // Ambil teks dari berbagai jenis pesan
    const text = m.message.conversation 
        || m.message.extendedTextMessage?.text 
        || m.message.imageMessage?.caption
        || m.message.videoMessage?.caption
        || "";
    
    // Cek apakah pesan dimulai dengan prefix dari array
    const usedPrefix = config.prefix.find(p => text.startsWith(p));
    if (!usedPrefix) return;

    // fromMe = pesan dari bot sendiri = otomatis owner, langsung proses
    const isSelfMessage = m.key.fromMe;

    // Cek Mode Bot (Public / Self)
    let botMode = 'public';
    if (fs.existsSync(modeFile)) {
        botMode = JSON.parse(fs.readFileSync(modeFile, 'utf8')).mode;
    }

    if (botMode === 'self' && !isSelfMessage && !isOwner(m)) {
        return; // Mode self: hanya owner dan bot sendiri yang boleh
    }

    // Pisahkan nama command dan argumen
    const args = text.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Eksekusi file command jika ada
    const command = commands.get(commandName);
    if (command) {
        try {
            await command.execute(sock, m, args);
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            await sock.sendMessage(m.key.remoteJid, { text: 'Terjadi kesalahan saat mengeksekusi perintah tersebut.' }, { quoted: m });
        }
    }
}
