export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url || !url.startsWith('https://')) {
      return Response.json({ error: 'url tidak valid' }, { status: 400 })
    }

    const res = await fetch(url)
    if (!res.ok) throw new Error('Gagal mengunduh hasil dari server enhancer')

    const buffer = Buffer.from(await res.arrayBuffer())
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Gagal mengambil hasil' }, { status: 500 })
  }
}
