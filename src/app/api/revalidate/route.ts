import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.REVALIDATION_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  try {
    const { paths = ['/'] } = await req.json()
    for (const path of paths as string[]) revalidatePath(path)
    return NextResponse.json({ ok: true, revalidated: paths })
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
}
