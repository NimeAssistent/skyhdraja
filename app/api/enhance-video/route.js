export const runtime = 'nodejs'
export const maxDuration = 300

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    return { __httpError: true, status: res.status, raw: text }
  }
  if (!res.ok) return { __httpError: true, status: res.status, raw: json }
  return json
}

async function hdvideo(buffer) {
  const baseApi = 'https://api.unblurimage.ai'
  const productSerial = crypto.randomUUID().replace(/-/g, '')

  const uploadForm = new FormData()
  uploadForm.set('video_file_name', `web-${Date.now()}.mp4`)

  const uploadResp = await jsonFetch(
    `${baseApi}/api/upscaler/v1/ai-video-enhancer/upload-video`,
    { method: 'POST', body: uploadForm }
  )
  if (uploadResp.__httpError || uploadResp.code !== 100000) throw new Error('Upload gagal')

  const { url: uploadUrl, object_name } = uploadResp.result || {}
  if (!uploadUrl || !object_name) throw new Error('Upload tidak valid')

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'video/mp4' },
    body: buffer
  })
  if (!putRes.ok) throw new Error('Upload video gagal')

  const cdnUrl = `https://cdn.unblurimage.ai/${object_name}`

  const jobForm = new FormData()
  jobForm.set('original_video_file', cdnUrl)
  jobForm.set('resolution', '2k')
  jobForm.set('is_preview', 'false')

  const createJobResp = await jsonFetch(
    `${baseApi}/api/upscaler/v2/ai-video-enhancer/create-job`,
    { method: 'POST', body: jobForm, headers: { 'product-serial': productSerial, authorization: '' } }
  )
  if (createJobResp.__httpError || createJobResp.code !== 100000) throw new Error('Membuat job gagal')

  const { job_id } = createJobResp.result || {}
  if (!job_id) throw new Error('Job tidak valid')

  const startTime = Date.now()
  let attempt = 0
  let result

  while (true) {
    attempt++
    const jobResp = await jsonFetch(
      `${baseApi}/api/upscaler/v2/ai-video-enhancer/get-job/${job_id}`,
      { method: 'GET', headers: { 'product-serial': productSerial, authorization: '' } }
    )
    if (jobResp.__httpError) throw new Error('Mengambil status job gagal')

    if (jobResp.code === 100000) {
      result = jobResp.result || {}
      if (result.output_url) break
    }

    if (Date.now() - startTime > 600000) throw new Error('Timeout proses (10 menit)')
    await sleep(attempt === 1 ? 20000 : 10000)
  }

  return result.output_url
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Tidak ada video yang dikirim' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return Response.json({ error: 'Maksimal ukuran video 50MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const outputUrl = await hdvideo(buffer)

    const videoRes = await fetch(outputUrl)
    if (!videoRes.ok) throw new Error('Gagal mengunduh hasil video')
    const resultBuffer = Buffer.from(await videoRes.arrayBuffer())

    return new Response(resultBuffer, {
      status: 200,
      headers: { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' }
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Gagal memproses video' }, { status: 500 })
  }
}
