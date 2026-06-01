// 标签白名单 - AI 打标必须从此库中选择
// 体裁标签
export const GENRE_TAGS = [
  "诗", "词", "赋", "文", "骈文", "乐府", "民谣", "词牌", "律诗", "绝句", "古风",
] as const;

// 主题标签
export const THEME_TAGS = [
  "楚辞", "咏物", "时令", "写雪", "梅花", "柳树", "写山", "黄河", "写马",
  "爱国", "思乡", "励志", "悼亡", "母亲", "读书", "婉约", "友情",
  "惜时", "豪放", "边塞", "春节", "清明", "中秋", "抒情", "送别",
  "爱情", "闺怨", "老师", "战争", "忧民", "山水", "闲适", "怀古",
  "写景", "人物", "羁旅", "孤寂", "哲理", "田园", "家庭", "饮酒",
  "登临", "咏怀", "梦", "夜", "隐逸", "愁绪", "赠答", "怀人",
  "行旅", "贬谪", "秋思", "盛世", "思妇", "春景", "秋景",
] as const;

// 所有合法标签
export const ALL_TAGS = [...GENRE_TAGS, ...THEME_TAGS] as const;

export type TagName = (typeof ALL_TAGS)[number];

// 检查标签是否在库中
export function isKnownTag(tag: string): boolean {
  return (ALL_TAGS as readonly string[]).includes(tag);
}

// 过滤并分类 AI 生成的标签
export function filterTags(aiTags: string[]): { known: string[]; recommended: string[] } {
  const known: string[] = [];
  const recommended: string[] = [];
  for (const tag of aiTags) {
    const clean = tag.replace(/\*$/, "").trim();
    if (isKnownTag(clean)) {
      known.push(clean);
    } else {
      // 带 * 的是推荐新标签
      recommended.push(tag.endsWith("*") ? clean : tag);
    }
  }
  return { known, recommended };
}
