import qrcode from 'qrcode-terminal';
import fs from 'fs';

export default function handleConnection(update, startBot, DisconnectReason) {
    const { connection, lastDisconnect, qr } = update;
    
    // Tampilkan QR Code secara manual jika string qr tersedia
    if (qr) {
        qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log('Koneksi tertutup. Alasan:', lastDisconnect?.error?.message || lastDisconnect?.error, 'Status Code:', statusCode);
        
        if (shouldReconnect) {
            if (statusCode === DisconnectReason.restartRequired) {
                console.log('[RESTART] Restart diperlukan, langsung menyambung kembali...');
                startBot();
            } else {
                console.log('Mencoba reconnect dalam 5 detik untuk menghindari rate limit...');
                setTimeout(() => {
                    startBot();
                }, 5000);
            }
        } else {
            console.log('Sesi login telah kedaluwarsa atau di-logout (401). Menghapus sisa sesi...');
            if (fs.existsSync('auth_info_baileys')) {
                fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                console.log('Folder auth_info_baileys berhasil dihapus otomatis.');
            }
            console.log('Silakan jalankan ulang bot (npm start).');
        }
    } else if (connection === 'open') {
        console.log('[SUCCESS] Bot WhatsApp berhasil terhubung!');
    }
}
