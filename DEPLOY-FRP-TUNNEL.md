# Tunnel YouTube Download Lewat Internet Rumahan (frp)

Panduan ini nyambungin server RNB Studio di Railway ke internet rumahan kamu, khusus buat proses download YouTube — biar yt-dlp gak keblokir karena IP server (datacenter), tapi pakai IP rumahan kamu yang gak pernah keblokir.

**Server-nya (`frps`) udah otomatis ke-bundle di Dockerfile, gak perlu setup tambahan di Railway selain isi 2 environment variable.** Kamu cuma perlu setup **client**-nya (`frpc`) di PC.

## Yang perlu kamu tau dulu

- ✅ Fitur ini **opt-in** (mati by default) — gak akan aktif kalau kamu gak set `ENABLE_FRP_TUNNEL=true`
- ⚠️ **PC kamu harus nyala + `frpc.exe` harus jalan** setiap kali mau convert dari YouTube. Kalau mati, convert YouTube bakal gagal (fitur lain di web tetap normal)
- ✅ Gratis, gak ada biaya proxy apapun

---

## Bagian 1 — Setup di Railway

### 1. Generate token rahasia

Ini buat ngunci tunnel-nya biar cuma PC kamu yang bisa nyambung (bukan orang random di internet). Bikin string acak panjang, misal:
```
rnbstudio-tunnel-x7k2m9p4q1
```
(boleh ganti sesuka kamu, yang penting susah ditebak)

### 2. Tambahin Environment Variables

Railway → Variables → Raw Editor, tambahin:
```
ENABLE_FRP_TUNNEL=true
FRP_AUTH_TOKEN=rnbstudio-tunnel-x7k2m9p4q1
YTDLP_PROXY=socks5://127.0.0.1:6000
```
(Ganti `FRP_AUTH_TOKEN` sesuai token yang kamu bikin di step 1)

**Update Variables**, tunggu redeploy.

### 3. Bikin TCP Proxy buat port 7000

1. Service kamu → **Settings** → **Networking**
2. Klik **TCP Proxy**
3. Masukin port: `7000`
4. Railway bakal kasih alamat publik, bentuknya kayak:
   ```
   caboose.proxy.rlwy.net:41823
   ```
   (host dan port beda-beda per akun) — **catat ini**, dipake di step berikutnya

---

## Bagian 2 — Setup di PC kamu (client)

### 1. Download frpc

1. Buka https://github.com/fatedier/frp/releases
2. Cari rilis terbaru, download file **`frp_x.x.x_windows_amd64.zip`**
3. Extract ke folder, misal `C:\frp`

### 2. Bikin file config `frpc.toml`

Di folder `C:\frp`, bikin file baru namanya `frpc.toml` (pakai Notepad, save as, pilih "All Files" biar gak jadi `.txt`), isinya:

```toml
serverAddr = "caboose.proxy.rlwy.net"
serverPort = 41823

auth.method = "token"
auth.token = "rnbstudio-tunnel-x7k2m9p4q1"

[[proxies]]
name = "socks5_proxy"
type = "tcp"
remotePort = 6000

[proxies.plugin]
type = "socks5"
```

**Ganti**:
- `serverAddr` dan `serverPort` → sesuai TCP Proxy address dari Bagian 1 step 3
- `auth.token` → sesuai token yang kamu bikin di Bagian 1 step 1

### 3. Jalankan frpc

Buka Command Prompt, masuk ke folder `C:\frp`:
```
cd C:\frp
frpc.exe -c frpc.toml
```

Kalau berhasil, bakal muncul log:
```
[I] login to server success
[I] [socks5_proxy] start proxy success
```

**Biarkan Command Prompt ini tetap terbuka** selama kamu mau pakai fitur convert YouTube.

---

## Bagian 3 — Test

1. Buka RNB Studio di browser
2. Coba convert link YouTube
3. Kalau berhasil — download-nya sekarang lewat internet rumahan kamu, bukan server Railway

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `frpc.exe` error "connection refused" | Pastikan TCP Proxy di Railway udah bener (Bagian 1 step 3), cek lagi host:port di `frpc.toml` |
| `frpc.exe` error "authentication failed" | Token di `frpc.toml` gak sama persis dengan `FRP_AUTH_TOKEN` di Railway |
| Convert YouTube masih gagal padahal frpc jalan | Cek `YTDLP_PROXY` di Railway persis `socks5://127.0.0.1:6000` (port harus sama dengan `remotePort` di frpc.toml) |
| Mau matiin fitur ini | Set `ENABLE_FRP_TUNNEL=false` di Railway, hapus/kosongin `YTDLP_PROXY` |

## Cara jalanin frpc otomatis tiap Windows nyala (opsional)

Kalau capek jalanin manual tiap kali:
1. Bikin file `.bat` isinya:
   ```bat
   cd /d C:\frp
   frpc.exe -c frpc.toml
   ```
2. Taruh **shortcut** file `.bat` itu di folder Startup Windows (`Win+R`, ketik `shell:startup`, Enter, taruh shortcut di situ)
3. Tiap kali PC nyala, `frpc` otomatis jalan di background
