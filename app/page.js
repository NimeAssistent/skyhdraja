'use client'

import { useState, useRef, useCallback } from 'react'

export default function Home() {
  const [file, setFile] = useState(null)
  const [beforeUrl, setBeforeUrl] = useState(null)
  const [afterUrl, setAfterUrl] = useState(null)
  const [sliderValue, setSliderValue] = useState(50)
  const [isPro, setIsPro] = useState(false)
  const [isMore, setIsMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ text: '', kind: '' })
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f.type.startsWith('image/')) {
      setStatus({ text: 'File harus berupa gambar.', kind: 'error' })
      return
    }
    const url = URL.createObjectURL(f)
    setFile(f)
    setBeforeUrl(url)
    setAfterUrl(url)
    setSliderValue(50)
    setStatus({ text: '', kind: '' })
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const onReset = () => {
    setFile(null)
    setBeforeUrl(null)
    setAfterUrl(null)
    setStatus({ text: '', kind: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onEnhance = async () => {
    if (!file) return
    setLoading(true)
    setStatus({ text: 'Memproses foto…', kind: '' })

    try {
      const form = new FormData()
      form.append('is_pro_version', isPro ? 'true' : 'false')
      form.append('is_enhancing_more', isMore ? 'true' : 'false')
      form.append('file', file)

      const res = await fetch('/api/enhance', { method: 'POST', body: form })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server menolak permintaan (${res.status})`)
      }

      const blob = await res.blob()
      setAfterUrl(URL.createObjectURL(blob))
      setSliderValue(50)
      setStatus({ text: 'Selesai. Geser untuk membandingkan.', kind: 'ok' })
    } catch (err) {
      setStatus({ text: 'Gagal memproses: ' + err.message, kind: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onDownload = () => {
    if (!afterUrl) return
    const a = document.createElement('a')
    a.href = afterUrl
    a.download = 'terang-hd.jpg'
    a.click()
  }

  return (
    <>
      <nav>
        <div className="brand"><span className="dot"></span>Terang</div>
        <div className="nav-links">
          <a href="#studio">Coba sekarang</a>
          <a href="#cara">Cara kerja</a>
        </div>
      </nav>

      <section className="hero">
        <div>
          <h1>Tarik detail dari gelap ke terang.</h1>
          <p className="lede">
            Terang memperluas rentang dinamis fotomu — bayangan yang tenggelam
            diangkat, sorotan yang terbakar dijinakkan, tanpa membuat hasilnya
            terlihat diedit berlebihan.
          </p>
          <div className="hero-stats">
            <div className="stat"><div className="n cyan">+38%</div><div className="l">detail bayangan terangkat</div></div>
            <div className="stat"><div className="n">−22%</div><div className="l">sorotan yang hangus</div></div>
            <div className="stat"><div className="n cyan">2×</div><div className="l">resolusi keluaran</div></div>
          </div>
        </div>
        <div className="curve-box">
          <svg viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg">
            <line x1="30" y1="20" x2="30" y2="270" stroke="rgba(236,231,222,0.15)" strokeWidth="1" />
            <line x1="30" y1="270" x2="340" y2="270" stroke="rgba(236,231,222,0.15)" strokeWidth="1" />
            <path d="M30,260 Q100,255 140,180 T230,60 Q270,25 340,20" fill="none" stroke="rgba(236,231,222,0.25)" strokeWidth="1.5" strokeDasharray="3 5" />
            <path d="M30,240 Q110,235 150,140 T260,45 Q300,20 340,15" fill="none" stroke="url(#g)" strokeWidth="3" />
            <defs>
              <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#5FD9E8" />
                <stop offset="100%" stopColor="#FF8A4C" />
              </linearGradient>
            </defs>
            <circle cx="150" cy="140" r="4" fill="#5FD9E8" />
            <circle cx="260" cy="45" r="4" fill="#FF8A4C" />
            <text x="34" y="285" fill="#9AA0A8" fontSize="11" fontFamily="Archivo, sans-serif">gelap</text>
            <text x="300" y="285" fill="#9AA0A8" fontSize="11" fontFamily="Archivo, sans-serif">terang</text>
          </svg>
        </div>
      </section>

      <section className="studio" id="studio">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Unggah foto</h2>
              <p>JPG atau PNG. Diproses lewat server, bukan langsung dari peramban.</p>
            </div>
          </div>

          <label
            className={'dropzone' + (dragging ? ' drag' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="icon">⇧</div>
            <div className="title">Seret foto ke sini, atau klik untuk memilih</div>
            <div className="sub">Satu gambar setiap kali proses</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>

          <div className="options">
            <label className="opt">
              <input type="checkbox" checked={isPro} onChange={(e) => setIsPro(e.target.checked)} />
              Mode pro
            </label>
            <label className="opt">
              <input type="checkbox" checked={isMore} onChange={(e) => setIsMore(e.target.checked)} />
              Perbaikan tambahan
            </label>
          </div>

          <div className="actions">
            <button className="btn-primary" disabled={!file || loading} onClick={onEnhance}>
              Perluas rentang cahaya
            </button>
            {file && (
              <button className="btn-ghost" onClick={onReset}>Ganti foto</button>
            )}
            {afterUrl && afterUrl !== beforeUrl && (
              <button className="btn-ghost" onClick={onDownload}>Unduh hasil</button>
            )}
          </div>

          <div className={'status' + (status.kind ? ' ' + status.kind : '')}>
            {loading && <span className="spinner"></span>}
            {status.text}
          </div>

          {beforeUrl && (
            <div className="compare-area show">
              <div className="compare">
                <img src={beforeUrl} alt="Sebelum" />
                <div className="after-wrap" style={{ clipPath: `inset(0 0 0 ${sliderValue}%)` }}>
                  <img src={afterUrl} alt="Sesudah" />
                </div>
                <div className="handle" style={{ left: `${sliderValue}%` }}></div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="compare-slider"
              />
              <div className="compare-labels"><span>Sebelum</span><span>Sesudah</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="steps" id="cara">
        <h2>Tiga langkah, tanpa slider rumit</h2>
        <div className="steps-list">
          <div className="step">
            <div className="num">01</div>
            <h3>Unggah</h3>
            <p>Pilih foto yang bayangannya terlalu gelap atau sorotannya terlalu terang.</p>
          </div>
          <div className="step">
            <div className="num">02</div>
            <h3>Proses</h3>
            <p>Server Next.js meneruskan foto ke layanan enhancer dan menunggu hasilnya.</p>
          </div>
          <div className="step">
            <div className="num">03</div>
            <h3>Bandingkan &amp; unduh</h3>
            <p>Geser pembanding untuk melihat perubahan, lalu unduh versi penuhnya.</p>
          </div>
        </div>
      </section>

      <footer>
        <span>Terang — antarmuka web untuk layanan enhancer gambar.</span>
        <span>Permintaan diproses lewat API Route (server), bukan langsung dari peramban.</span>
      </footer>
    </>
  )
}
