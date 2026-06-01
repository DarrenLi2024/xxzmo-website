import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calibrateArticlePinyin } from '@/lib/pinyin-calibration';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await calibrateArticlePinyin(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '拼音语境校准失败';
    console.error('拼音语境校准失败:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const article = await prisma.article.findUnique({
      where: { id },
      select: { pinyin: true },
    });
    
    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    
    if (!article.pinyin) {
      return NextResponse.json({ success: false, message: '未生成拼音' });
    }
    
    return NextResponse.json({ success: true, data: JSON.parse(article.pinyin) });
  } catch (error) {
    console.error('获取拼音失败:', error);
    return NextResponse.json({ error: '获取拼音失败' }, { status: 500 });
  }
}
