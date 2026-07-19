import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, error: 'Ad ID is required' }, { status: 400 })
    }

    await prisma.advertisement.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to track click' }, { status: 500 })
  }
}
