# Terang — HD/HDR Photo Enhancer (Next.js)

Web enhancer foto yang memanggil layanan `ihancer.com` lewat **API Route**
Next.js (server-side), bukan langsung dari browser — jadi tidak kena blokir
CORS seperti versi HTML statis.

## Menjalankan di lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Deploy ke Vercel

**Cara termudah (tanpa CLI):**
1. Push folder ini ke repo GitHub.
2. Buka https://vercel.com/new, import repo tersebut.
3. Vercel otomatis mendeteksi ini project Next.js — klik **Deploy**.

**Lewat CLI:**
```bash
npm i -g vercel
vercel
```

Tidak perlu environment variable apa pun untuk versi ini.

## Struktur

- `app/page.js` — UI (upload, slider before/after, opsi mode pro / perbaikan tambahan)
- `app/api/enhance/route.js` — proxy server-side ke `ihancer.com/api/enhance`
- `app/globals.css` — styling

## Catatan

- `ihancer.com` adalah layanan pihak ketiga yang tidak berafiliasi dengan project ini.
  Jika mereka mengubah endpoint atau memblokir berdasarkan asal request, panggilan
  di `route.js` perlu disesuaikan.
- Durasi eksekusi API Route dibatasi `maxDuration = 60` detik — sesuaikan dengan
  paket Vercel yang dipakai jika foto besar butuh waktu lebih lama.
