import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PAINTINGS = [
  {
    title: "富春山居图",
    artist: "黄公望",
    dynasty: "元",
    url: "https://res.cbvea.com/painting/2024/03/fuchun.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/fuchun_thumb.jpg",
    description: "元代画家黄公望的代表作，以浙江富春江为背景，描绘了连绵起伏的山峦和江上的渔舟",
    tags: ["山水", "富春", "山居", "渔舟", "隐逸"],
    externalId: "default-富春山居图",
    externalSource: "default",
  },
  {
    title: "千里江山图",
    artist: "王希孟",
    dynasty: "宋",
    url: "https://res.cbvea.com/painting/2024/03/qianli.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/qianli_thumb.jpg",
    description: "北宋画家王希孟的传世之作，以青绿山水技法描绘了祖国的壮丽山河",
    tags: ["山水", "青绿", "江山", "壮阔", "磅礴"],
    externalId: "default-千里江山图",
    externalSource: "default",
  },
  {
    title: "清明上河图",
    artist: "张择端",
    dynasty: "宋",
    url: "https://res.cbvea.com/painting/2024/03/qingming.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/qingming_thumb.jpg",
    description: "北宋画家张择端的风俗画杰作，描绘了汴京清明时节的繁华景象",
    tags: ["人物", "市井", "风俗", "繁华", "都市"],
    externalId: "default-清明上河图",
    externalSource: "default",
  },
  {
    title: "墨梅图",
    artist: "王冕",
    dynasty: "元",
    url: "https://res.cbvea.com/painting/2024/03/plum.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/plum_thumb.jpg",
    description: "元代画家王冕的墨梅作品，以水墨技法表现梅花的清雅高洁",
    tags: ["花鸟", "梅花", "墨笔", "清雅", "高洁"],
    externalId: "default-墨梅图",
    externalSource: "default",
  },
  {
    title: "松鹤延年图",
    artist: "沈铨",
    dynasty: "清",
    url: "https://res.cbvea.com/painting/2024/03/crane.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/crane_thumb.jpg",
    description: "清代画家沈铨的作品，描绘松鹤延年的吉祥寓意",
    tags: ["花鸟", "松鹤", "吉祥", "延年", "祥瑞"],
    externalId: "default-松鹤延年图",
    externalSource: "default",
  },
  {
    title: "兰竹图",
    artist: "郑板桥",
    dynasty: "清",
    url: "https://res.cbvea.com/painting/2024/03/bamboo.jpg",
    thumbnail: "https://res.cbvea.com/painting/2024/03/bamboo_thumb.jpg",
    description: "清代画家郑板桥的兰竹作品，以简练的笔墨表现兰竹的神韵",
    tags: ["花鸟", "兰竹", "文人画", "清雅", "君子"],
    externalId: "default-兰竹图",
    externalSource: "default",
  },
];

async function initDefaultPaintings() {
  console.log("开始初始化默认配图...");

  let successCount = 0;
  let skipCount = 0;

  for (const painting of DEFAULT_PAINTINGS) {
    try {
      const existing = await prisma.painting.findUnique({
        where: { externalId: painting.externalId },
      });

      if (existing) {
        console.log(`⏭️  跳过已存在的配图: ${painting.title}`);
        skipCount++;
        continue;
      }

      await prisma.painting.create({
        data: {
          title: painting.title,
          artist: painting.artist,
          dynasty: painting.dynasty,
          url: painting.url,
          thumbnail: painting.thumbnail,
          description: painting.description,
          tags: JSON.stringify(painting.tags),
          externalId: painting.externalId,
          externalSource: painting.externalSource,
          matchCount: 0,
        },
      });

      console.log(`✅ 成功添加配图: ${painting.title}`);
      successCount++;
    } catch (error) {
      console.error(`❌ 添加配图失败: ${painting.title}`, error);
    }
  }

  console.log("\n初始化完成！");
  console.log(`成功添加: ${successCount} 张`);
  console.log(`已跳过: ${skipCount} 张`);
  console.log(`总计: ${successCount + skipCount} 张`);
}

initDefaultPaintings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
