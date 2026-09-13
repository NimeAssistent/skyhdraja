import axios from 'axios'
import FormData from 'form-data'

export const runtime = 'nodejs'
export const maxDuration = 60

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRandomIP() {
  return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 255)}`
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function upscaleBuffer(imageBuffer, scale = '4') {
  const randomIp = generateRandomIP()
  const commonHeaders = {
    Origin: 'https://imgupscaler.com',
    Referer: 'https://imgupscaler.com/',
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'X-Client-Ipv4': randomIp,
    'X-Forwarded-For': randomIp
  }

  const form = new FormData()
  form.append('tool', 'upscaler')
  form.append('mode', 'batch')
  form.append('scaleRadio', scale)
  form.append('file', imageBuffer, {
    filename: `image_${Date.now()}.jpg`,
    contentType: 'image/jpeg'
  })

  const uploadRes = await axios.post('https://imgupscaler.com/api/legacy/upload', form, {
    headers: { ...form.getHeaders(), ...commonHeaders }
  })

  const taskId = uploadRes.data?.taskId
  if (!taskId) throw new Error('Gagal mendapatkan taskId dari server imgupscaler')

  let attempts = 0
  const maxAttempts = 50

  while (attempts < maxAttempts) {
    attempts++
    await sleep(2000)

    const statusRes = await axios.post(
      'https://imgupscaler.com/api/legacy/status',
      { tool: 'upscaler', taskId, scaleRadio: scale },
      { headers: { 'Content-Type': 'application/json', ...commonHeaders } }
    )

    const resData = statusRes.data

    if (resData.status === 'success' && resData.downloadUrls?.length) {
      return resData.downloadUrls[0]
    }
    if (resData.status !== 'waiting') {
      throw new Error('Proses gagal di server (mungkin gambar terlalu besar)')
    }
  }

  throw new Error('Timeout: proses upscale memakan waktu terlalu lama')
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const scale = formData.get('scale') || '4'

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Tidak ada file yang dikirim' }, { status: 400 })
    }
    if (!file.type?.startsWith('image/')) {
      return Response.json({ error: 'File harus berupa gambar' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const downloadUrl = await upscaleBuffer(buffer, scale)

    const imgRes = await fetch(downloadUrl)
    if (!imgRes.ok) throw new Error('Gagal mengunduh hasil upscale')
    const resultBuffer = Buffer.from(await imgRes.arrayBuffer())

    return new Response(resultBuffer, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' }
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Gagal memproses gambar' }, { status: 500 })
  }
}
