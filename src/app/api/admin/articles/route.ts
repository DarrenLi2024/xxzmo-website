import { NextRequest, NextResponse } from "next/server";
import { generateUniqueSlug } from "@/lib/article-slug";
import { validateString, validateEnum, validateTags, validateOptionalString } from "@/lib/validate";
import { ARTICLE_TYPES, ARTICLE_STATUS, SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createArticleWithTags } from "@/lib/tag-service";
import { serializeArticleAdmin } from "@/lib/serialize";
import { logAdminAction } from "@/lib/admin-log";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const status = searchParams.get("status") || "all";
  const type = searchParams.get("type");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (status !== "all") where.status = status;
  if (type) where.type = type;
  if (tag) where.tags = { some: { tag: { name: tag } } };
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { body: { contains: search } },
      { author: { contains: search } },
      { tagList: { contains: search } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { tags: { include: { tag: true } }, painting: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    articles: articles.map((article) => serializeArticleAdmin(article)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = validateString(body.title, "标题");
    const source = validateEnum(body.source, ["chuli", "jigu"], "来源");
    const type = validateEnum(body.type, ARTICLE_TYPES, "类型");
    const bodyText = validateString(body.body, "正文");
    const status = validateEnum(body.status || "draft", ARTICLE_STATUS, "状态");

    const tags = validateTags(body.tags);
    const paintingId = await validateLocalPaintingId(body.paintingId);

    const article = await createArticleWithTags({
      data: {
        slug: body.slug || await generateUniqueSlug(title),
        title,
        source,
        type,
        body: bodyText,
        author: validateOptionalString(body.author) || SITE.authorName,
        dateRaw: validateOptionalString(body.dateRaw),
        preface: validateOptionalString(body.preface),
        postscript: validateOptionalString(body.postscript),
        notes: validateOptionalString(body.notes),
        status,
        paintingId,
        tagList: tags.length > 0 ? JSON.stringify(tags) : "[]",
      },
    }, tags);

    await logAdminAction({
      action: "article.create",
      entityType: "article",
      entityId: article.id,
      summary: `创建${source === "jigu" ? "辑古录" : "樗栎集"}「${article.title}」`,
      metadata: { source, status, tagCount: tags.length },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function validateLocalPaintingId(value: unknown): Promise<string | null> {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("配图 ID 无效");
  const painting = await prisma.painting.findUnique({
    where: { id: value },
    select: { id: true, url: true },
  });
  if (!painting || !painting.url) {
    throw new Error("只能选择本地上传配图");
  }
  return painting.id;
}
