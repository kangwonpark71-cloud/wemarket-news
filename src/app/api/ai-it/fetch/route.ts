import { NextRequest, NextResponse } from 'next/server';
import { fetchAllAIITNews, fetchAIITNewsByCategory, fetchAIITNewsBySubcategory, triggerFetch, run15MinJob, run30MinJob, run60MinJob } from '@/lib/ai-it/scheduler-service';

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
          return NextResponse.json({ success: false, error: 'Category required' }, { status: 400 });
        }
        break;
      case 'subcategory':
        if (subcategory) {
          result = await fetchAIITNewsBySubcategory(subcategory);
        } else {
          return NextResponse.json({ success: false, error: 'Subcategory required' }, { status: 400 });
        }
        break;
      case 'source':
        if (sourceNameEn) {
          result = await triggerFetch(sourceNameEn);
        } else {
          return NextResponse.json({ success: false, error: 'Source name required' }, { status: 400 });
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
    console.error('[API] AI/IT Fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger fetch' },
      { status: 500 }
    );
  }
}