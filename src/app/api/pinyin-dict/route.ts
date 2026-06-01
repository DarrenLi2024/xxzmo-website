import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dict = await prisma.pinyinDict.findMany({
      select: { phrase: true, pinyin: true },
    });

    // 返回 Record<string, string> 格式，直接可用于 customPinyin()
    const map: Record<string, string> = {};
    for (const entry of dict) {
      map[entry.phrase] = entry.pinyin;
    }

    return NextResponse.json(map, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('获取拼音词典失败:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
