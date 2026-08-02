import { NextResponse } from 'next/server';
import { getTodayBriefing } from '@/lib/services/briefing/briefing-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiBriefing');

export async function GET() {
  try {
    const briefing = await getTodayBriefing();
    return NextResponse.json({ success: true, data: briefing });
  } catch (error) {
    log.error('Failed to get today briefing:', error);
    return NextResponse.json(
      { success: false, error: '오늘의 브리핑을 불러오는 데 실패했습니다.' },
      { status: 500 },
    );
  }
}
