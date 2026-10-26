# Paket per jenis acara (tampilan dulu, belum ada pembayaran)

Setiap jenis acara punya paket dan harga sendiri. Saat membuat acara, pemilik memilih jenis acara dulu, lalu paketnya. Batas paket langsung berlaku untuk acara itu.

## Jenis acara
Wedding, Engagement/Lamaran, Birthday, Graduation, Anniversary, Aqiqah/Syukuran, Reunion, Corporate, Lainnya.

## Tingkat paket (sama untuk semua jenis)
| | Gratis | Basic | Premium | Exclusive |
|---|---|---|---|---|
| Jumlah foto | 100 | 500 | 2.000 | Tanpa batas |
| Album aktif | 7 hari | 30 hari | 6 bulan | 1 tahun |
| Unduh semua (ZIP) | - | - | Ya | Ya |
| Tanpa logo VELORA | - | - | - | Ya |

## Harga per jenis acara (contoh, bisa diubah)
| Jenis | Basic | Premium | Exclusive |
|---|---|---|---|
| Wedding / Engagement | Rp 149rb | Rp 349rb | Rp 699rb |
| Corporate | Rp 199rb | Rp 449rb | Rp 899rb |
| Graduation / Reunion | Rp 99rb | Rp 249rb | Rp 499rb |
| Birthday / Anniversary / Aqiqah / Lainnya | Rp 79rb | Rp 199rb | Rp 399rb |

Tiap jenis acara juga mendapat nama paket dan deskripsi singkat yang sesuai, misalnya "Wedding Premium: cocok untuk resepsi hingga 500 tamu".

## Yang berubah
1. **Halaman Harga**: ada tab per jenis acara (Wedding, Birthday, Graduation, dan seterusnya). Tiap tab menampilkan 4 paket dalam Rupiah dengan keterangan "pembayaran segera hadir".
2. **Form acara**: pilih jenis acara, lalu kartu paket dengan harga sesuai jenis itu. Batas foto album mengikuti paket.
3. **Halaman acara (pemilik)**: label paket, sisa kuota foto, tanggal album berakhir, dan tombol "Unduh semua (ZIP)" untuk Premium dan Exclusive.
4. **Halaman tamu**: upload ditutup dengan pesan yang jelas setelah masa aktif habis. Logo VELORA disembunyikan untuk Exclusive.
5. Acara yang sudah ada otomatis jadi Premium supaya tidak langsung terkunci.

## Detail teknis
- Kolom baru di events: `plan` (default 'free', dibatasi 4 nilai) dan `expires_at`. Acara lama di-backfill ke 'premium' dengan masa aktif 6 bulan.
- Satu modul `src/lib/plans.ts` berisi tingkat paket (fitur) dan tabel harga per jenis acara. Dipakai oleh halaman harga, form, dan server.
- `saveEvent` memvalidasi plan dan jenis acara, menetapkan max_photos, dan menghitung expires_at.
- Upload tamu ditolak jika masa aktif sudah lewat. Data acara publik membawa flag hideBranding.
- ZIP dibuat di browser dari tautan aman milik pemilik, hanya untuk paket yang mengizinkan.
- Tes unit untuk harga per jenis acara, batas foto, durasi, serta fitur ZIP dan branding.
