import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { buildArticlePinyinData, isCurrentArticlePinyinData, ensurePinyinDict } from '@/lib/article-pinyin';

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(rateLimitKey(request, 'pinyin'), 10, 60000);
    if (!rateLimit.allowed) {
      return rateLimitResponse('请求过于频繁，请稍后再试', rateLimit);
    }

    const { articleId } = await request.json();
    
    if (!articleId) {
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
    }
    
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, author: true, body: true, status: true },
    });
    
    if (!article || article.status !== 'published') {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    
    await ensurePinyinDict();
    const pinyinData = buildArticlePinyinData(article);
    
    await prisma.article.update({
      where: { id: articleId },
      data: { pinyin: JSON.stringify(pinyinData) },
    });
    
    return NextResponse.json({ success: true, data: pinyinData });
  } catch (error) {
    console.error('拼音生成失败:', error);
    return NextResponse.json({ error: '拼音生成失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    
    if (!articleId) {
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
    }
    
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, author: true, body: true, pinyin: true, status: true },
    });
    
    if (!article || article.status !== 'published') {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    
    if (!article.pinyin) {
      return NextResponse.json({ success: false, message: '未生成拼音' });
    }

    const pinyinData: unknown = JSON.parse(article.pinyin);
    if (!isCurrentArticlePinyinData(pinyinData, article)) {
      return NextResponse.json({ success: false, message: '未生成拼音' });
    }

    return NextResponse.json({ success: true, data: pinyinData });
  } catch (error) {
    console.error('获取拼音失败:', error);
    return NextResponse.json({ error: '获取拼音失败' }, { status: 500 });
  }
}
