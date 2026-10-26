# Paket per acara (tampilan dulu, belum ada pembayaran)

Setiap acara punya paketnya sendiri. Paket dipilih saat membuat atau mengedit acara, dan batasnya langsung berlaku.

## Paket

| | Gratis | Basic | Premium | Exclusive |
|---|---|---|---|---|
| Harga (contoh) | Rp 0 | Rp 99rb | Rp 249rb | Rp 499rb |
| Jumlah foto | 100 | 500 | 2.000 | Tanpa batas (20.000) |
| Album aktif | 7 hari | 30 hari | 6 bulan | 1 tahun |
| Unduh semua (ZIP) | - | - | Ya | Ya |
| Tanpa logo VELORA | - | - | - | Ya |

## Yang berubah
1. **Halaman Harga**: menampilkan 4 paket per acara dalam Rupiah, dengan keterangan "pembayaran segera hadir".
2. **Form acara**: ada pilihan paket berupa kartu. Batas foto album ikut paket (batas per tamu tetap bisa diatur).
3. **Halaman acara (pemilik)**: label paket, sisa kuota foto, tanggal album berakhir, dan tombol "Unduh semua (ZIP)" untuk Premium/Exclusive.
4. **Halaman tamu**: setelah masa aktif habis, upload ditutup dengan pesan yang jelas. Logo VELORA disembunyikan untuk paket Exclusive.
5. Acara yang sudah ada otomatis dianggap paket Premium supaya tidak ada yang langsung terkunci.

## Detail teknis
- Kolom baru di events: `plan` (text, default 'free', check di 4 nilai) dan `expires_at` (timestamptz). Backfill acara lama ke 'premium' dengan expires_at = created_at + 6 bulan.
- Satu modul `src/lib/plans.ts` berisi definisi paket (harga, maxPhotos, durasi hari, zip, branding) dan dipakai halaman harga, form, dan server.
- `saveEvent` memvalidasi plan, menetapkan max_photos dari paket, dan menghitung expires_at dari tanggal acara (atau hari ini).
- `processUpload` dan pemuatan acara publik menolak upload jika `expires_at` sudah lewat, dan mengirim flag `hideBranding`.
- ZIP: server fn untuk pemilik yang mengembalikan signed URL. ZIP dibuat di browser dengan `fflate`, hanya untuk paket yang mengizinkan.
- Tes unit untuk aturan paket: batas foto, durasi, dan fitur ZIP/branding per paket.
