import axios from 'axios'

export const runtime = 'nodejs'
export const maxDuration = 15

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function generateRandomIP() {
  return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 255)}`
}
function commonHeaders() {
  const ip = generateRandomIP()
  return {
    Origin: 'https://imgupscaler.com',
    Referer: 'https://imgupscaler.com/',
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
    'X-Client-Ipv4': ip,
    'X-Forwarded-For': ip
  }
}

export async function POST(request) {
  try {
    const { taskId, scale } = await request.json()
    if (!taskId) {
      return Response.json({ error: 'taskId wajib diisi' }, { status: 400 })
    }

    const statusRes = await axios.post(
      'https://imgupscaler.com/api/legacy/status',
      { tool: 'upscaler', taskId, scaleRadio: scale || '4' },
      { headers: { 'Content-Type': 'application/json', ...commonHeaders() }, validateStatus: () => true }
    )

    const data = statusRes.data

    if (data?.status === 'success' && data.downloadUrls?.length) {
      return Response.json({ status: 'success', downloadUrl: data.downloadUrls[0] })
    }
    if (data?.status === 'waiting') {
      return Response.json({ status: 'waiting' })
    }

    return Response.json(
      { status: 'failed', error: 'Proses gagal di server (mungkin gambar terlalu besar)', detail: data },
      { status: 200 }
    )
  } catch (err) {
    return Response.json({ status: 'failed', error: err.message || 'Gagal cek status' }, { status: 500 })
  }
}
