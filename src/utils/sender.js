import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ownersFile = path.join(__dirname, '../data/owners.json');

/**
 * Mengambil sender ID dari message.
 * - Private chat: remoteJid (format nomor, e.g. 628xxx@s.whatsapp.net)
 * - Group chat: participant (bisa LID format, e.g. lid:xxxxx@lid)
 */
export function getSender(msg) {
    return msg.key.participant || msg.key.remoteJid;
}

/**
 * Menghasilkan semua format JID yang mungkin untuk pencocokan.
 */
export function getJidFormats(jid) {
    if (!jid || typeof jid !== 'string') return [];
    const formats = new Set();

    formats.add(jid);

    const [local, domain] = jid.split('@');
    if (local) {
        formats.add(local); // e.g. "628xxx" or "lid:xxx"

        const cleanId = local.startsWith('lid:') ? local.slice(4) : local;
        formats.add(cleanId); // e.g. "xxx"

        formats.add(`${cleanId}@s.whatsapp.net`);
        formats.add(`${cleanId}@lid`);
        formats.add(`lid:${cleanId}@lid`);
        formats.add(`lid:${cleanId}`);
    }

    return [...formats];
}

/**
 * Mengecek apakah dua identifier merujuk ke pengguna yang sama.
 */
export function isSameJid(id1, id2) {
    const formats1 = getJidFormats(id1);
    const formats2 = getJidFormats(id2);
    return formats1.some(f => formats2.includes(f));
}

/**
 * Mengambil semua kemungkinan identifier dari sender.
 * Mengembalikan array berisi semua format yang bisa digunakan untuk matching.
 */
export function getSenderIds(msg) {
    const ids = new Set();

    const participant = msg.key.participantPn;
    const remoteJid = msg.key.remoteJid;

    // participant (LID atau nomor)
    if (participant) {
        getJidFormats(participant).forEach(id => ids.add(id));
    }

    // remoteJid (untuk private chat, masih nomor)
    if (remoteJid && !remoteJid.endsWith('@g.us')) {
        getJidFormats(remoteJid).forEach(id => ids.add(id));
    }

    return [...ids];
}

/**
 * Mengecek apakah sender adalah owner.
 * Mendukung pengecekan via nomor telepon, LID, dan full JID.
 */
export function isOwner(msg) {
    if (msg.key.fromMe) return true;
    const senderIds = getSenderIds(msg);

    // Cek apakah salah satu ID sender cocok dengan config.owners
    for (const id of senderIds) {
        if (config.owners.includes(id)) return true;
        if (id === config.phoneNumber) return true;
    }

    // Cek di file owners.json
    const fileOwners = getFileOwners();
    for (const id of senderIds) {
        if (fileOwners.includes(id)) return true;
    }


    return false;
}

/**
 * Membaca daftar owners dari file.
 */
export function getFileOwners() {
    if (fs.existsSync(ownersFile)) {
        return JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
    }
    return [];
}

/**
 * Menyimpan daftar owners ke file.
 */
export function saveFileOwners(owners) {
    fs.writeFileSync(ownersFile, JSON.stringify(owners, null, 2));
}
