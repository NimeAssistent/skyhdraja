import axios from 'axios'
import FormData from 'form-data'

export const runtime = 'nodejs'
export const maxDuration = 30

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function generateRandomIP() {
  return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 255)}`
}

export function commonHeaders() {
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

    const form = new FormData()
    form.append('tool', 'upscaler')
    form.append('mode', 'batch')
    form.append('scaleRadio', scale)
    form.append('file', buffer, {
      filename: `image_${Date.now()}.jpg`,
      contentType: file.type
    })

    const uploadRes = await axios.post('https://imgupscaler.com/api/legacy/upload', form, {
      headers: { ...form.getHeaders(), ...commonHeaders() },
      validateStatus: () => true
    })

    const taskId = uploadRes.data?.taskId
    if (!taskId) {
      return Response.json(
        {
          error: 'Server imgupscaler tidak memberi taskId',
          detail: typeof uploadRes.data === 'string' ? uploadRes.data.slice(0, 300) : uploadRes.data
        },
        { status: 502 }
      )
    }

    return Response.json({ taskId, scale })
  } catch (err) {
    return Response.json({ error: err.message || 'Gagal mengunggah gambar' }, { status: 500 })
  }
}
