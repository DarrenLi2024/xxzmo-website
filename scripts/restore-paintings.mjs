/**
 * Restore user-uploaded paintings from Vercel Blob and re-link articles.
 * Run: POSTGRES_PRISMA_URL=... BLOB_READ_WRITE_TOKEN=... node scripts/restore-paintings.mjs
 */
import { PrismaClient } from "@prisma/client";
import { list } from "@vercel/blob";

const BLOB_BASE =
  "https://jobiqbayprfm19rz.public.blob.vercel-storage.com/paintings";

/** User uploads in Blob (deduplicated by content title). */
const USER_PAINTINGS = [
  {
    pathname: "1780673793307-lzrxclfh0zb.png",
    title: "滕王阁序",
    artist: "王勃",
    dynasty: "唐",
    tags: ["怀古", "登临", "骈文"],
  },
  {
    pathname: "1780676200127-7hi18g8ttj6.png",
    title: "短歌行",
    artist: "曹操",
    dynasty: "汉",
    tags: ["咏怀", "月夜"],
  },
  {
    pathname: "1780676667591-w8d2qz40xb.png",
    title: "屈原·渔父",
    artist: "屈原",
    dynasty: "战国",
    tags: ["怀古", "渔父", "楚辞"],
  },
  {
    pathname: "1780677944009-h3fro2nxidq.png",
    title: "立春即事",
    artist: "狂野君",
    dynasty: "",
    tags: ["立春", "春景", "时令"],
  },
  {
    pathname: "1780678389218-h0ukdfmiwof.png",
    title: "西江月·为妻题画",
    artist: "狂野君",
    dynasty: "",
    tags: ["题画", "爱情", "闺意"],
  },
  {
    pathname: "1780678881650-4z5x9rdabz.png",
    title: "五律·中秋夜望月怀人",
    artist: "狂野君",
    dynasty: "",
    tags: ["中秋", "望月", "怀人"],
  },
  {
    pathname: "1780679325919-p512snbzmil.png",
    title: "清平乐·村居",
    artist: "狂野君",
    dynasty: "",
    tags: ["田园", "村居", "童趣"],
  },
  {
    pathname: null,
    url: "/paintings/5799fc5c-340a-41a6-a982-e7783e51bd71.png",
    title: "七绝·醉红尘",
    artist: "狂野君",
    dynasty: "",
    tags: ["饮酒", "月夜", "感怀"],
  },
];

/** Article slug → painting title */
const ARTICLE_LINKS = [
  { source: "jigu", slug: "滕王阁序-mp80haf2", paintingTitle: "滕王阁序" },
  { source: "chuli", slug: "七绝-立春即事-66wevc", paintingTitle: "立春即事" },
  { source: "chuli", slug: "西江月-为妻题画-bc1ahy", paintingTitle: "西江月·为妻题画" },
  { source: "chuli", slug: "五律-中秋夜望月怀人-7ix5sv", paintingTitle: "五律·中秋夜望月怀人" },
  { source: "chuli", slug: "清平乐-村居", paintingTitle: "清平乐·村居" },
  { source: "chuli", slug: "读-渔父-感怀屈子-mp7ze62u", paintingTitle: "屈原·渔父" },
  { source: "chuli", slug: "悼屈子-mp821lpc", paintingTitle: "屈原·渔父" },
  { source: "jigu", slug: "渔父", paintingTitle: "屈原·渔父" },
  { source: "chuli", slug: "七绝-醉红尘-kg53wc", paintingTitle: "七绝·醉红尘" },
];

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const remote = await list({ prefix: "paintings/", limit: 100, token });
    console.log(`Blob store: ${remote.blobs.length} files`);
  }

  const prisma = new PrismaClient();
  const paintingByTitle = new Map();

  for (const item of USER_PAINTINGS) {
    const url = item.url ?? `${BLOB_BASE}/${item.pathname}`;
    const existing = await prisma.painting.findFirst({ where: { url } });
    const record =
      existing ??
      (await prisma.painting.create({
        data: {
          title: item.title,
          artist: item.artist || null,
          dynasty: item.dynasty || null,
          url,
          tags: JSON.stringify(item.tags),
        },
      }));
    paintingByTitle.set(item.title, record);
    console.log("painting:", item.title, "→", url.slice(0, 72));
  }

  for (const link of ARTICLE_LINKS) {
    const painting = paintingByTitle.get(link.paintingTitle);
    if (!painting) {
      console.warn("skip (no painting):", link.slug);
      continue;
    }
    const result = await prisma.article.updateMany({
      where: { source: link.source, slug: link.slug },
      data: { paintingId: painting.id },
    });
    console.log("linked:", link.source + "/" + link.slug, "→", link.paintingTitle, `(${result.count})`);
  }

  // Clear seed-placeholder links on articles that now have no user upload mapping
  const userPaintingIds = [...paintingByTitle.values()].map((p) => p.id);
  const seedIds = (
    await prisma.painting.findMany({
      where: { url: { startsWith: "/paintings/" }, NOT: { url: { contains: "5799fc5c" } } },
      select: { id: true },
    })
  ).map((p) => p.id);

  const cleared = await prisma.article.updateMany({
    where: {
      paintingId: { in: seedIds },
      NOT: { paintingId: { in: userPaintingIds } },
    },
    data: { paintingId: null },
  });
  console.log("cleared seed-placeholder links:", cleared.count);

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
