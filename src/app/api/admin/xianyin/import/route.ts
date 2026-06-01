import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createArticleWithTags } from "@/lib/tag-service";
import { SITE } from "@/lib/constants";
import { generateContentBasedSlug } from "@/lib/utils";

interface ImportArticle {
  title: string;
  body: string;
  type: string;
  subType?: string;
  preface?: string;
  postscript?: string;
}

export async function POST(request: Request) {
  try {
    const { articles } = await request.json();

    if (!articles || !Array.isArray(articles)) {
      return NextResponse.json({ error: "请提供待导入的文章列表" }, { status: 400 });
    }

    const created: { id: string; slug: string; title: string }[] = [];

    for (const article of articles) {
      const { title, body, type, subType, preface, postscript } = article;
      
      if (!title || !body) continue;

      // 生成基于内容的唯一slug
      let slug = generateContentBasedSlug(title, body);
      
      // 检查数据库中是否已存在该slug
      const existingArticle = await prisma.article.findUnique({
        where: { slug },
        select: { id: true },
      });
      
      if (existingArticle) {
        // 如果存在，添加时间戳避免冲突
        slug = `${slug}-${Date.now()}`;
      }

      const created_article = await createArticleWithTags({
        data: {
          slug,
          title,
          author: SITE.authorName,
          source: "chuli",
          type: type || "诗",
          body,
          preface: preface || null,
          postscript: postscript || null,
          status: "draft",
          tagList: JSON.stringify([]),
        },
      }, []);

      created.push({
        id: created_article.id,
        slug: created_article.slug,
        title: created_article.title,
      });
    }

    return NextResponse.json({
      articles: created,
      count: created.length,
      importTime: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
