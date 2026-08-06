import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) {
      return apiError('Ad ID is required', 400)
    }

    await prisma.advertisement.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch {
    return apiError('Failed to track impression', 500)
  }
}
