import { PrismaClient } from "@prisma/client";
import { buildArticlePinyinData, isCurrentArticlePinyinData } from "../src/lib/article-pinyin";

const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    where: {
      status: "published",
      pinyin: { not: null },
    },
    select: { id: true, title: true, author: true, body: true, pinyin: true },
  });

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const parsed = JSON.parse(article.pinyin!);
      if (isCurrentArticlePinyinData(parsed, article)) {
        skipped++;
        continue;
      }

      const newData = buildArticlePinyinData(article);
      await prisma.article.update({
        where: { id: article.id },
        data: { pinyin: JSON.stringify(newData) },
      });
      migrated++;
      console.log(`OK: ${article.title}`);
    } catch (err) {
      console.error(`FAIL: ${article.title}`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
