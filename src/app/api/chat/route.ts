import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/utils/auth';
import { askEconomicNews, saveChatMessage, getChatHistory } from '@/lib/services/chat/chat-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiChat');

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return apiError('메시지를 입력해주세요.', 400);
    }

    // Truncate very long messages
    const truncated = message.slice(0, 1000);

    // For logged-in users, include chat history for context
    const history = user
      ? await getChatHistory(user.id, 6) // Last 3 exchanges
      : [];

    history.push({ role: 'user', content: truncated });

    const result = await askEconomicNews(history);

    // Save to DB if logged in
    if (user) {
      await saveChatMessage(user.id, truncated, 'user').catch(() => {});
      await saveChatMessage(user.id, result.answer, 'assistant').catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        answer: result.answer,
        sources: result.sources,
      },
    });
  } catch (error) {
    log.error('Chat API error:', error);
    return apiError('챗봇 응답 생성 중 오류가 발생했습니다.', 500);
  }
}
