import { fileTypeFromBuffer } from 'file-type'

export const runtime = 'nodejs'
export const maxDuration = 60

async function ihancer(buffer, { isPro, isMore }) {
  const check = await fileTypeFromBuffer(buffer)
  if (!check?.mime || !check.mime.startsWith('image')) {
    throw new Error('File harus berupa gambar')
  }

  const form = new FormData()
  const blob = new Blob([buffer], { type: check.mime })

  form.append('method', '1')
  form.append('is_pro_version', isPro ? 'true' : 'false')
  form.append('is_enhancing_more', isMore ? 'true' : 'false')
  form.append('max_image_size', 'high')
  form.append('file', blob, `image.${check.ext}`)

  const res = await fetch('https://ihancer.com/api/enhance', {
    method: 'POST',
    headers: {
      'Accept-Encoding': 'gzip',
      'User-Agent': 'Dart/3.5 (dart:io)'
    },
    body: form
  })

  if (!res.ok) {
    throw new Error(`Enhancer menolak permintaan (status ${res.status})`)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Tidak ada file yang dikirim' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const isPro = formData.get('is_pro_version') === 'true'
    const isMore = formData.get('is_enhancing_more') === 'true'

    const result = await ihancer(buffer, { isPro, isMore })

    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    return Response.json(
      { error: err.message || 'Gagal memproses gambar' },
      { status: 500 }
    )
  }
}
