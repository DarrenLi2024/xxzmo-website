import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: 列出词典，支持分页和筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const verified = searchParams.get('verified');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (verified !== null && verified !== '') where.verified = verified === 'true';
    if (search) where.phrase = { contains: search };

    const [items, total] = await Promise.all([
      prisma.pinyinDict.findMany({
        where: where as any,
        orderBy: [{ verified: 'asc' }, { category: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pinyinDict.count({ where: where as any }),
    ]);

    // 获取分类统计
    const categories = await prisma.pinyinDict.groupBy({
      by: ['category'],
      _count: true,
    });

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: categories.map(c => ({ name: c.category, count: c._count })),
    });
  } catch (error) {
    console.error('获取拼音词典失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST: 新增/更新词典条目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phrase, pinyin, category, source } = body;

    if (!phrase || !pinyin) {
      return NextResponse.json({ error: 'phrase 和 pinyin 为必填项' }, { status: 400 });
    }

    const entry = await prisma.pinyinDict.upsert({
      where: { phrase },
      create: {
        phrase,
        pinyin,
        category: category || '通假字',
        source: source || null,
        verified: true, // 人工添加的直接确认
      },
      update: {
        pinyin,
        category: category || '通假字',
        source: source || null,
        verified: true,
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('更新拼音词典失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// PATCH: 确认或批量确认
export async function PATCH(request: NextRequest) {
  try {
    const { ids, verified } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请提供条目 ID 列表' }, { status: 400 });
    }

    await prisma.pinyinDict.updateMany({
      where: { id: { in: ids } },
      data: { verified: verified ?? true },
    });

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    console.error('批量确认失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// DELETE: 删除词典条目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '请提供条目 ID' }, { status: 400 });
    }

    await prisma.pinyinDict.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除拼音词典条目失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
