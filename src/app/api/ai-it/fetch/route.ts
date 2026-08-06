import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { fetchAllAIITNews, fetchAIITNewsByCategory, fetchAIITNewsBySubcategory, triggerFetch, run15MinJob, run30MinJob, run60MinJob } from '@/lib/ai-it/scheduler-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitFetch')

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sourceNameEn = searchParams.get('source');
    const category = searchParams.get('category') as 'ai' | 'it' | null;
    const subcategory = searchParams.get('subcategory');

    let result;

    switch (action) {
      case 'all':
        result = await fetchAllAIITNews();
        break;
      case 'category':
        if (category) {
          result = await fetchAIITNewsByCategory(category);
        } else {
          return apiError('Category required', 400);
        }
        break;
      case 'subcategory':
        if (subcategory) {
          result = await fetchAIITNewsBySubcategory(subcategory);
        } else {
          return apiError('Subcategory required', 400);
        }
        break;
      case 'source':
        if (sourceNameEn) {
          result = await triggerFetch(sourceNameEn);
        } else {
          return apiError('Source name required', 400);
        }
        break;
      case '15min':
        await run15MinJob();
        result = { totalCount: 0, totalNew: 0 };
        break;
      case '30min':
        await run30MinJob();
        result = { totalCount: 0, totalNew: 0 };
        break;
      case '60min':
        await run60MinJob();
        result = { totalCount: 0, totalNew: 0 };
        break;
      default:
        result = await fetchAllAIITNews();
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    log.error('[API] AI/IT Fetch error:', error);
    return apiError('Failed to trigger fetch', 500);
  }
}