import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 站点配置
  await prisma.siteConfig.upsert({
    where: { id: "site" },
    update: {},
    create: {
      id: "site",
      siteName: "闲心子墨",
      seoDesc: "狂野君的诗文空间 — 樗栎集原创 · 辑古录经典",
      authorName: "狂野君",
      authorTitle: "山房主人",
      avatarUrl: "/images/avatar.jpg",
      bio: "性喜山林，偶作诗文",
      signature: "樗栎本无用，天地一散人",
      homeChuliCount: 10,
      showStats: true,
      quoteSource: "collection_first",
      quoteAiStyle: "山林隐逸，洒脱不羁，偶见悲怆",
      importSeparator: "---",
    },
  });

  // LLM Provider 默认配置
  const providers = [
    {
      name: "deepseek-v4-pro",
      label: "DeepSeek V4-Pro",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-v4-pro",
      priority: 1,
      enabled: true,
    },
    {
      name: "deepseek-v4-flash",
      label: "DeepSeek V4-Flash",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-v4-flash",
      priority: 2,
      enabled: true,
    },
    {
      name: "minimax",
      label: "MiniMax",
      baseUrl: "https://api.minimaxi.com/v1",
      model: "MiniMax-M2.7",
      priority: 3,
      enabled: true,
    },
    {
      name: "zhipu",
      label: "智谱 GLM",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-4-plus",
      priority: 4,
      enabled: false,
    },
    {
      name: "volcengine",
      label: "火山引擎",
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "doubao-pro-32k",
      priority: 5,
      enabled: false,
    },
    {
      name: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "anthropic/claude-3.5-sonnet",
      priority: 6,
      enabled: false,
    },
  ];

  for (const provider of providers) {
    await prisma.llmProvider.upsert({
      where: { name: provider.name },
      update: {},
      create: provider,
    });
  }

  // 预设古画库（部分示例）
  const paintings = [
    {
      title: "富春山居图",
      artist: "黄公望",
      dynasty: "元",
      url: "/paintings/fuchunshanju.jpg",
      tags: JSON.stringify(["山水", "秋天", "隐逸", "长卷"]),
    },
    {
      title: "韩熙载夜宴图",
      artist: "顾闳中",
      dynasty: "五代",
      url: "/paintings/hanxizaiye.jpg",
      tags: JSON.stringify(["人物", "宴会", "夜"]),
    },
    {
      title: "千里江山图",
      artist: "王希孟",
      dynasty: "宋",
      url: "/paintings/qianlichiangshan.jpg",
      tags: JSON.stringify(["山水", "青绿", "宏大"]),
    },
    {
      title: "清明上河图",
      artist: "张择端",
      dynasty: "宋",
      url: "/paintings/qingming-shanghe.jpg",
      tags: JSON.stringify(["市井", "风俗", "繁华"]),
    },
    {
      title: "溪山行旅图",
      artist: "范宽",
      dynasty: "宋",
      url: "/paintings/xishan-xinglv.jpg",
      tags: JSON.stringify(["山水", "行旅", "壮阔"]),
    },
  ];

  for (const painting of paintings) {
    await prisma.painting.create({ data: painting });
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
