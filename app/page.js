'use client'

import { useState, useRef, useCallback } from 'react'

export default function Home() {
  const [mode, setMode] = useState('photo') // 'photo' | 'video'

  // --- state foto ---
  const [file, setFile] = useState(null)
  const [beforeUrl, setBeforeUrl] = useState(null)
  const [afterUrl, setAfterUrl] = useState(null)
  const [sliderValue, setSliderValue] = useState(50)
  const [scale, setScale] = useState('4')

  // --- state video ---
  const [videoFile, setVideoFile] = useState(null)
  const [videoBeforeUrl, setVideoBeforeUrl] = useState(null)
  const [videoAfterUrl, setVideoAfterUrl] = useState(null)

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ text: '', kind: '' })
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const switchMode = (m) => {
    setMode(m)
    setStatus({ text: '', kind: '' })
  }

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

  const handleVideoFile = useCallback((f) => {
    if (!f.type.startsWith('video/')) {
      setStatus({ text: 'File harus berupa video.', kind: 'error' })
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setStatus({ text: `Maksimal ukuran video 50MB (video kamu ${(f.size / 1024 / 1024).toFixed(1)}MB).`, kind: 'error' })
      return
    }
    setVideoFile(f)
    setVideoBeforeUrl(URL.createObjectURL(f))
    setVideoAfterUrl(null)
    setStatus({ text: '', kind: '' })
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    if (mode === 'photo') handleFile(f)
    else handleVideoFile(f)
  }

  const onReset = () => {
    if (mode === 'photo') {
      setFile(null); setBeforeUrl(null); setAfterUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      setVideoFile(null); setVideoBeforeUrl(null); setVideoAfterUrl(null)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
    setStatus({ text: '', kind: '' })
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const onEnhancePhoto = async () => {
    if (!file) return
    setLoading(true)
    setStatus({ text: 'Mengunggah foto…', kind: '' })
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('scale', scale)

      const startRes = await fetch('/api/enhance-start', { method: 'POST', body: form })
      const startData = await startRes.json().catch(() => ({}))
      if (!startRes.ok) throw new Error(startData.error || `Upload ditolak (${startRes.status})`)

      const { taskId } = startData
      let downloadUrl = null
      const maxAttempts = 60

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        setStatus({ text: `Memproses foto… (${attempt}/${maxAttempts})`, kind: '' })
        await sleep(2000)

        const statusRes = await fetch('/api/enhance-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, scale })
        })
        const statusData = await statusRes.json().catch(() => ({}))

        if (statusData.status === 'success') {
          downloadUrl = statusData.downloadUrl
          break
        }
        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Proses gagal di server')
        }
        // status 'waiting' -> lanjut loop
      }

      if (!downloadUrl) throw new Error('Timeout: proses upscale memakan waktu terlalu lama')

      setStatus({ text: 'Mengambil hasil…', kind: '' })
      const resultRes = await fetch(`/api/enhance-result?url=${encodeURIComponent(downloadUrl)}`)
      if (!resultRes.ok) throw new Error('Gagal mengambil hasil gambar')
      const blob = await resultRes.blob()

      setAfterUrl(URL.createObjectURL(blob))
      setSliderValue(50)
      setStatus({ text: 'Selesai. Geser untuk membandingkan.', kind: 'ok' })
    } catch (err) {
      setStatus({ text: 'Gagal memproses: ' + err.message, kind: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onEnhanceVideo = async () => {
    if (!videoFile) return
    setLoading(true)
    setStatus({ text: 'Mengunggah video… proses bisa memakan waktu 5–10 menit.', kind: '' })
    try {
      const form = new FormData()
      form.append('file', videoFile)

      const res = await fetch('/api/enhance-video', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server menolak permintaan (${res.status})`)
      }
      const blob = await res.blob()
      setVideoAfterUrl(URL.createObjectURL(blob))
      setStatus({ text: 'Selesai. Video 2K siap diunduh.', kind: 'ok' })
    } catch (err) {
      setStatus({ text: 'Gagal memproses: ' + err.message, kind: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onDownload = () => {
    const url = mode === 'photo' ? afterUrl : videoAfterUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = mode === 'photo' ? 'terang-hd.jpg' : 'terang-hd.mp4'
    a.click()
  }

  const hasFile = mode === 'photo' ? !!file : !!videoFile
  const hasResult = mode === 'photo' ? afterUrl && afterUrl !== beforeUrl : !!videoAfterUrl

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
            Terang memperluas rentang dinamis foto dan videomu — bayangan yang
            tenggelam diangkat, sorotan yang terbakar dijinakkan.
          </p>
          <div className="hero-stats">
            <div className="stat"><div className="n cyan">4×</div><div className="l">skala upscale foto</div></div>
            <div className="stat"><div className="n">2K</div><div className="l">resolusi video</div></div>
            <div className="stat"><div className="n cyan">50MB</div><div className="l">batas ukuran video</div></div>
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
              <h2>{mode === 'photo' ? 'Unggah foto' : 'Unggah video'}</h2>
              <p>
                {mode === 'photo'
                  ? 'JPG atau PNG, diproses lewat imgupscaler.com.'
                  : 'MP4, maksimal 50MB, diproses lewat unblurimage.ai (2K, 5–10 menit).'}
              </p>
            </div>
            <div className="tabs">
              <button
                type="button"
                className={'tab' + (mode === 'photo' ? ' active' : '')}
                onClick={() => switchMode('photo')}
              >Foto</button>
              <button
                type="button"
                className={'tab' + (mode === 'video' ? ' active' : '')}
                onClick={() => switchMode('video')}
              >Video</button>
            </div>
          </div>

          {mode === 'photo' ? (
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
          ) : (
            <label
              className={'dropzone' + (dragging ? ' drag' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="icon">⇧</div>
              <div className="title">Seret video ke sini, atau klik untuk memilih</div>
              <div className="sub">MP4, maksimal 50MB</div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
              />
            </label>
          )}

          {mode === 'photo' && (
            <div className="options">
              <label className="opt">
                Skala upscale
                <select value={scale} onChange={(e) => setScale(e.target.value)} className="select">
                  <option value="2">2×</option>
                  <option value="4">4×</option>
                  <option value="8">8×</option>
                </select>
              </label>
            </div>
          )}

          <div className="actions">
            <button
              className="btn-primary"
              disabled={!hasFile || loading}
              onClick={mode === 'photo' ? onEnhancePhoto : onEnhanceVideo}
            >
              {mode === 'photo' ? 'Perluas rentang cahaya' : 'Enhance ke 2K'}
            </button>
            {hasFile && <button className="btn-ghost" onClick={onReset}>Ganti file</button>}
            {hasResult && <button className="btn-ghost" onClick={onDownload}>Unduh hasil</button>}
          </div>

          <div className={'status' + (status.kind ? ' ' + status.kind : '')}>
            {loading && <span className="spinner"></span>}
            {status.text}
          </div>

          {mode === 'photo' && beforeUrl && (
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

          {mode === 'video' && videoBeforeUrl && (
            <div className="compare-area show video-compare">
              <div>
                <div className="compare-labels"><span>Sebelum</span></div>
                <video src={videoBeforeUrl} controls />
              </div>
              {videoAfterUrl && (
                <div>
                  <div className="compare-labels"><span>Sesudah (2K)</span></div>
                  <video src={videoAfterUrl} controls />
                </div>
              )}
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
            <p>Pilih foto atau video yang ingin dipertajam.</p>
          </div>
          <div className="step">
            <div className="num">02</div>
            <h3>Proses</h3>
            <p>Server Next.js meneruskan file ke layanan enhancer dan menunggu hasilnya.</p>
          </div>
          <div className="step">
            <div className="num">03</div>
            <h3>Bandingkan &amp; unduh</h3>
            <p>Lihat hasilnya, lalu unduh versi penuhnya.</p>
          </div>
        </div>
      </section>

      <footer>
        <span>Terang — antarmuka web untuk layanan enhancer foto &amp; video.</span>
        <span>Diproses lewat API Route (server), bukan langsung dari peramban.</span>
      </footer>
    </>
  )
}
