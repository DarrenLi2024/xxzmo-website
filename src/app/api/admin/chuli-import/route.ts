import { NextRequest, NextResponse } from "next/server";
import { generateSlug, generateContentBasedSlug } from "@/lib/utils";
import { createArticleWithTags } from "@/lib/tag-service";
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createArticleWorkflows } from "@/lib/ai-workflow";

interface ParsedArticle {
  title: string;
  type: string;
  subType?: string; // 细分类型：绝句/律诗/词牌名等
  dateRaw?: string;
  tags: string[];
  preface?: string;
  body: string;
  postscript?: string;
  notes?: string;
  confidence: number; // 识别置信度
  splitReason?: string; // 分篇依据
  classificationReasons?: string[]; // 体裁识别依据
}

interface DuplicateMatch {
  type: "exact" | "similar";
  existingId: string;
  existingTitle: string;
  similarity: number;
}

interface ImportResult {
  articles: { id: string; slug: string; title: string; type: string; subType?: string; confidence: number }[];
  duplicates: { 
    original: string; 
    duplicate: string; 
    type: "exact" | "similar"; 
    similarity: number;
    diffSummary: string;
  }[];
  skipped: { reason: string; content: string; type?: string }[];
  existingMatches: {
    type: "exact" | "similar";
    existingId: string;
    existingTitle: string;
    importedTitle: string;
    similarity: number;
    importedBodyPreview: string;
    existingBodyPreview: string;
  }[];
  count: number;
  strategy: string;
  totalBlocks: number;
  parsedArticlesCount: number;
}

// ═══════════════════════════════════════════════════════════
// Genre Classification Engine - Production Grade
// ═══════════════════════════════════════════════════════════

const POETRY_SUBTYPES = {
  jueju: { name: "绝句", pattern: /^(五言|七言)?绝句?$/, lineCount: 4 },
  lvshi: { name: "律诗", pattern: /^(五言|七言)?律诗?$/, lineCount: 8 },
  yuefu: { name: "乐府", pattern: /乐府$|歌$|行$|吟$|引$|操$|辞$|曲$|篇$|章$/ },
  newpoetry: { name: "新诗", pattern: /^\d{4}/ }, // 现代诗通常有年份
  doggerel: { name: "打油诗", pattern: /^[一二三四五六七八九十]+、/ },
  ancient: { name: "古风", pattern: /古风$|古体$/ },
};

const CI_PAI_NAMES = [
  // 常用词牌名（去重排序）
  "八声甘州", "卜算子", "采桑子", "钗头凤", "丑奴儿",
  "蝶恋花", "定风波", "风入松", "感皇恩", "贺新郎",
  "浣溪沙", "减字木兰花", "江城子", "金陵怀古", "锦堂春",
  "锦缠道", "酒泉子", "兰陵王", "浪淘沙", "临江仙",
  "留春令", "柳梢青", "六丑", "六州歌头", "蓦山溪",
  "木兰花", "南歌子", "南乡子", "念奴娇", "女冠子",
  "抛球乐", "破阵子", "菩萨蛮", "沁园春", "青玉案",
  "清平乐", "秋日登洪府滕王阁饯别序", "鹊桥仙", "鹊踏枝",
  "绕佛阁", "瑞鹤仙", "瑞龙吟", "三姝媚", "哨遍",
  "少年游", "生查子", "声声慢", "十二时", "十六字令",
  "石州慢", "水龙吟", "水调歌头", "思帝乡", "苏幕遮",
  "苏武慢", "诉衷情", "踏莎行", "太常引", "唐多令",
  "天仙子", "万年欢", "望海潮", "望江南", "乌夜啼",
  "西江月", "惜分飞", "惜红衣", "西河", "西平乐",
  "喜迁莺", "夏云峰", "相见欢", "湘江静", "小重山",
  "谢池春", "行香子", "燕山亭", "宴山亭", "夜半乐",
  "谒金门", "一萼红", "一剪梅", "忆旧游", "忆秦娥",
  "忆王孙", "永遇乐", "雨霖铃", "玉楼春", "御街行",
  "鹧鸪天", "昭君怨", "招隐士", "鹧鸪天", "鹧鸪",
  "祝英台近", "醉春风", "醉花阴", "醉落魄", "醉蓬莱"
];

const CI_PAI_PATTERN = new RegExp(`^(${CI_PAI_NAMES.join("|")})[·・]?`);

const FU_INDICATORS = ["赋", "辞", "颂", "赞", "骚"];
const PROSE_INDICATORS = ["记", "序", "书", "论", "说", "表", "铭", "传", "状", "疏", "议", "启", "笺"];
const ESSAY_INDICATORS = ["随笔", "杂感", "漫谈", "偶得", "札记", "日记", "杂记", "琐记"];
const NOVEL_INDICATORS = ["小说", "故事", "演义", "传奇", "话本", "志异", "外传"];

// 词牌名到词的对应关系（用于验证）
const CI_PAI_TO_FORM: Record<string, { lines: number[]; chars: number[] }> = {
  "如梦令": { lines: [6, 6, 7, 6], chars: [6, 6, 7, 6] },
  "浣溪沙": { lines: [7, 7, 7, 7, 7, 7], chars: [7, 7, 7, 7, 7, 7] },
  "蝶恋花": { lines: [7, 7, 7, 9, 7, 7], chars: [7, 7, 7, 9, 7, 7] },
  "菩萨蛮": { lines: [4, 4, 5, 4, 4, 5], chars: [4, 4, 5, 4, 4, 5] },
  "清平乐": { lines: [4, 4, 6, 6, 4, 4], chars: [4, 4, 6, 6, 4, 4] },
  "西江月": { lines: [6, 6, 7, 6, 6, 7], chars: [6, 6, 7, 6, 6, 7] },
  "沁园春": { lines: [11, 4, 11, 4, 11, 12, 11, 4, 11], chars: [11, 4, 11, 4, 11, 12, 11, 4, 11] },
  "水调歌头": { lines: [9, 5, 9, 5, 9, 5, 5, 9, 5], chars: [9, 5, 9, 5, 9, 5, 5, 9, 5] },
  "念奴娇": { lines: [4, 4, 4, 4, 4, 4, 6, 4, 4], chars: [4, 4, 4, 4, 4, 4, 6, 4, 4] },
};

// 平仄模式特征（简化版）
const TRADITIONAL_POETRY_PATTERNS = {
  fiveCharacter: /^.{5}[，。？！、]$/,
  sevenCharacter: /^.{7}[，。？！、]$/,
};

// 现代诗特征词
const MODERN_POETRY_INDICATORS = ["我", "你", "他", "她", "它", "的", "了", "着", "过", "在", "是", "有", "不", "也", "都", "很", "就", "要", "会", "能", "可以"];

function classifyGenre(title: string, body: string): { type: string; subType: string; confidence: number; reasons: string[] } {
  const lines = body.trim().split("\n").filter((l) => l.trim());
  const charCount = body.replace(/\s/g, "").length;
  const avgLineLen = lines.length > 0 ? charCount / lines.length : 0;
  const trimmedTitle = title.trim();
  const reasons: string[] = [];

  // 词牌名识别（最高优先级）
  const ciPaiMatch = trimmedTitle.match(CI_PAI_PATTERN);
  if (ciPaiMatch) {
    const ciPaiName = ciPaiMatch[1];
    const contentMatch = verifyCiPaiForm(ciPaiName, lines);
    reasons.push(`标题识别到词牌名「${ciPaiName}」`);
    if (contentMatch) {
      reasons.push(`内容格式符合《${ciPaiName}》词谱`);
      return { type: "词", subType: ciPaiName, confidence: 0.97, reasons };
    }
    return { type: "词", subType: ciPaiName, confidence: 0.92, reasons };
  }

  // 赋识别
  if (FU_INDICATORS.some((ind) => trimmedTitle.includes(ind))) {
    const hasFuFeatures = body.includes("兮") || body.includes("之") || 
                         lines.some((l) => l.length > 30);
    reasons.push(`标题包含赋特征词「${FU_INDICATORS.find(ind => trimmedTitle.includes(ind))}」`);
    if (hasFuFeatures) {
      reasons.push("内容包含「兮」或长句特征");
    }
    return { type: "赋", subType: hasFuFeatures ? "" : "辞", confidence: 0.92, reasons };
  }

  // 文识别（标题包含特定后缀）
  const proseSuffixMatch = trimmedTitle.match(/(.+)(记|序|书|论|说|表|铭|传|状|疏|议|启|笺)$/);
  if (proseSuffixMatch) {
    const suffix = proseSuffixMatch[2];
    reasons.push(`标题后缀为「${suffix}」，判定为文`);
    if (suffix === "序") {
      return { type: "文", subType: "序", confidence: 0.95, reasons };
    }
    return { type: "文", subType: suffix, confidence: 0.88, reasons };
  }

  // 随笔识别
  if (ESSAY_INDICATORS.some((ind) => trimmedTitle.includes(ind))) {
    reasons.push(`标题包含随笔特征词「${ESSAY_INDICATORS.find(ind => trimmedTitle.includes(ind))}」`);
    return { type: "随笔", subType: "", confidence: 0.92, reasons };
  }

  // 小说识别
  if (NOVEL_INDICATORS.some((ind) => trimmedTitle.includes(ind))) {
    reasons.push(`标题包含小说特征词「${NOVEL_INDICATORS.find(ind => trimmedTitle.includes(ind))}」`);
    return { type: "小说", subType: "", confidence: 0.88, reasons };
  }

  // 基于正文特征分析（诗歌类）
  if (lines.length >= 2) {
    const cleanLines = lines.map((l) => l.replace(/\s/g, ""));
    
    // 七言绝句：4行，每行7字
    if (lines.length === 4 && cleanLines.every((l) => l.length === 7)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合七言绝句格式`);
      return { type: "诗", subType: "七言绝句", confidence: 0.98, reasons };
    }
    
    // 五言绝句：4行，每行5字
    if (lines.length === 4 && cleanLines.every((l) => l.length === 5)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合五言绝句格式`);
      return { type: "诗", subType: "五言绝句", confidence: 0.98, reasons };
    }
    
    // 七言律诗：8行，每行7字
    if (lines.length === 8 && cleanLines.every((l) => l.length === 7)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合七言律诗格式`);
      return { type: "诗", subType: "七言律诗", confidence: 0.97, reasons };
    }
    
    // 五言律诗：8行，每行5字
    if (lines.length === 8 && cleanLines.every((l) => l.length === 5)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合五言律诗格式`);
      return { type: "诗", subType: "五言律诗", confidence: 0.97, reasons };
    }
    
    // 绝句（不严格字数）
    if (lines.length === 4 && avgLineLen >= 5 && avgLineLen <= 10) {
      const isFiveChar = cleanLines.every((l) => l.length >= 4 && l.length <= 6);
      const isSevenChar = cleanLines.every((l) => l.length >= 6 && l.length <= 8);
      if (isFiveChar) {
        reasons.push(`共${lines.length}行，字数在4-6字之间，判定为五言绝句`);
        return { type: "诗", subType: "五言绝句", confidence: 0.90, reasons };
      }
      if (isSevenChar) {
        reasons.push(`共${lines.length}行，字数在6-8字之间，判定为七言绝句`);
        return { type: "诗", subType: "七言绝句", confidence: 0.90, reasons };
      }
      reasons.push(`共${lines.length}行，平均${avgLineLen.toFixed(1)}字，判定为绝句`);
      return { type: "诗", subType: "绝句", confidence: 0.85, reasons };
    }
    
    // 律诗（不严格字数）
    if (lines.length === 8 && avgLineLen >= 5 && avgLineLen <= 10) {
      const isFiveChar = cleanLines.every((l) => l.length >= 4 && l.length <= 6);
      const isSevenChar = cleanLines.every((l) => l.length >= 6 && l.length <= 8);
      if (isFiveChar) {
        reasons.push(`共${lines.length}行，字数在4-6字之间，判定为五言律诗`);
        return { type: "诗", subType: "五言律诗", confidence: 0.90, reasons };
      }
      if (isSevenChar) {
        reasons.push(`共${lines.length}行，字数在6-8字之间，判定为七言律诗`);
        return { type: "诗", subType: "七言律诗", confidence: 0.90, reasons };
      }
      reasons.push(`共${lines.length}行，平均${avgLineLen.toFixed(1)}字，判定为律诗`);
      return { type: "诗", subType: "律诗", confidence: 0.85, reasons };
    }
    
    // 乐府/古风：标题有特殊词尾，行数不定
    if (POETRY_SUBTYPES.yuefu.pattern.test(trimmedTitle)) {
      reasons.push(`标题包含乐府特征词尾`);
      return { type: "诗", subType: "乐府", confidence: 0.90, reasons };
    }
    
    // 古风（无词尾但形式古老）
    if (POETRY_SUBTYPES.ancient.pattern.test(trimmedTitle)) {
      reasons.push(`标题包含古风特征词`);
      return { type: "诗", subType: "古风", confidence: 0.88, reasons };
    }
    
    // 古风：行数多，字数不一，无严格格律
    if (lines.length >= 6 && lines.length <= 16 && 
        cleanLines.some((l) => l.length >= 5) && 
        cleanLines.some((l) => l.length !== cleanLines[0].length)) {
      reasons.push(`共${lines.length}行，字数不一，无严格格律，判定为古风`);
      return { type: "诗", subType: "古风", confidence: 0.82, reasons };
    }
    
    // 打油诗：序号开头，口语化
    if (POETRY_SUBTYPES.doggerel.pattern.test(lines[0])) {
      reasons.push(`首行以序号开头，判定为打油诗`);
      return { type: "诗", subType: "打油诗", confidence: 0.85, reasons };
    }
    
    // 打油诗：口语化词汇检测
    const doggerelIndicators = ["吃饭", "睡觉", "喝酒", "抽烟", "打牌", "吹牛", "放屁", "拉屎"];
    if (doggerelIndicators.some((ind) => body.includes(ind))) {
      reasons.push(`内容包含口语化词汇，判定为打油诗`);
      return { type: "诗", subType: "打油诗", confidence: 0.80, reasons };
    }
    
    // 新诗：现代语言特征检测
    const modernScore = lines.reduce((score, line) => {
      return score + MODERN_POETRY_INDICATORS.filter((ind) => line.includes(ind)).length;
    }, 0);
    
    // 新诗：行数多，长短不一，现代语言
    if (lines.length >= 4) {
      const hasModernPunctuation = body.includes("，") && body.includes("。");
      const hasFreeForm = cleanLines.some((l) => l.length > 20) && cleanLines.some((l) => l.length <= 5);
      const hasModernWords = modernScore >= lines.length;
      
      if (hasFreeForm || hasModernWords) {
        // 检查是否是现代诗（标题有年份）
        const yearMatch = trimmedTitle.match(/^\d{4}/);
        if (yearMatch) {
          reasons.push(`标题以年份「${yearMatch[0]}」开头，判定为新诗`);
          return { type: "诗", subType: "新诗", confidence: 0.90, reasons };
        }
        if (hasFreeForm) reasons.push("行数长短不一，符合新诗自由体特征");
        if (hasModernWords) reasons.push("包含较多现代语言特征词");
        return { type: "诗", subType: "新诗", confidence: 0.80, reasons };
      }
    }
    
    // 词：无词牌但有词的特征
    if (lines.length >= 2 && lines.length <= 10) {
      const avgChars = cleanLines.reduce((s, l) => s + l.length, 0) / cleanLines.length;
      if (avgChars >= 5 && avgChars <= 15) {
        const hasRhythm = cleanLines.every((l) => /[，。？！、]$/.test(l));
        if (hasRhythm) {
          reasons.push(`共${lines.length}行，平均${avgChars.toFixed(1)}字，有韵律，判定为词`);
          return { type: "词", subType: "", confidence: 0.78, reasons };
        }
      }
    }
    
    // 文/散文：长段落，多标点
    if (charCount > 200 || lines.some((l) => l.length > 30)) {
      const hasParagraphs = body.includes("\n\n");
      const hasComplexSentences = body.split("。").filter((s) => s.trim()).length >= 3;
      if (hasParagraphs || hasComplexSentences) {
        reasons.push(`内容较长(${charCount}字)，有多段落或复杂句式，判定为文`);
        return { type: "文", subType: "", confidence: 0.85, reasons };
      }
    }
    
    // 赋：长句、对偶、华丽词汇
    if (charCount > 300) {
      const hasParallelism = detectParallelism(body);
      if (hasParallelism) {
        reasons.push(`内容较长(${charCount}字)，检测到对偶结构，判定为赋`);
        return { type: "赋", subType: "", confidence: 0.82, reasons };
      }
    }
  }

  // 默认：诗
  reasons.push("未检测到明确特征，默认归类为诗");
  return { type: "诗", subType: "", confidence: 0.70, reasons };
}

function verifyCiPaiForm(ciPaiName: string, lines: string[]): boolean {
  const form = CI_PAI_TO_FORM[ciPaiName];
  if (!form) return true; // 未知词牌，默认认为匹配
  
  const cleanLines = lines.map((l) => l.replace(/\s/g, ""));
  if (cleanLines.length !== form.lines.length) return false;
  
  for (let i = 0; i < form.chars.length; i++) {
    if (Math.abs(cleanLines[i].length - form.chars[i]) > 1) {
      return false;
    }
  }
  return true;
}

function detectParallelism(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim());
  let parallelCount = 0;
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line1 = lines[i].trim();
    const line2 = lines[i + 1].trim();
    
    if (line1.length > 10 && line2.length > 10 && 
        Math.abs(line1.length - line2.length) <= 5) {
      // 检查是否有对偶结构
      const words1 = line1.split(/[，。、？！]/).filter((w) => w.length >= 2);
      const words2 = line2.split(/[，。、？！]/).filter((w) => w.length >= 2);
      
      if (words1.length === words2.length && words1.length >= 2) {
        parallelCount++;
      }
    }
  }
  
  return parallelCount >= 2;
}

// ═══════════════════════════════════════════════════════════
// Preface/Postscript Contextual Analysis
// ═══════════════════════════════════════════════════════════

interface ContextAnalysis {
  preface: string;
  body: string;
  postscript: string;
}

// 序的特征词
const PREFACE_KEYWORDS = [
  "余", "予", "仆", "某", "臣", "窃", "伏", "尝", "忆", "闻", "观", "览",
  "读", "见", "因", "时", "岁", "年", "月", "日", "既", "乃", "遂", "于是",
  "盖", "夫", "窃惟", "伏惟", "谨按", "谨识", "谨书", "谨启", "谨上",
  "序言", "引言", "前言", "题辞", "弁言", "引", "题", "书", "记", "述",
  "为", "作", "赋", "咏", "歌", "诵", "赞", "铭", "传", "论", "说",
];

// 跋的特征词
const POSTSCRIPT_KEYWORDS = [
  "书", "记", "题", "识", "跋", "后", "附", "末", "尾", "终", "竟",
  "时", "岁", "年", "月", "日", "既", "乃", "遂", "于是", "已而",
  "读毕", "览毕", "观毕", "阅毕", "既读", "既览", "既观", "既阅",
  "有感", "有作", "有赋", "有咏", "漫题", "偶题", "戏题", "书后",
  "后记", "附记", "题后", "识后", "跋尾", "末尾", "终篇", "竟篇",
];

// 第一人称代词（古代）
const ANCIENT_FIRST_PERSON = ["余", "予", "仆", "某", "臣", "妾", "愚", "不才", "不肖"];

function analyzeContext(title: string, content: string): ContextAnalysis {
  const lines = content.split("\n");
  let preface: string[] = [];
  let body: string[] = [];
  let postscript: string[] = [];

  const prefaceMarkers = ["序", "小序", "引言", "前言", "题辞", "弁言", "引"];
  const postscriptMarkers = ["跋", "后记", "附记", "题后", "识", "书后", "跋尾"];

  let phase: "preface" | "body" | "postscript" = "body";
  let prefaceConfirmed = false;
  let postscriptConfirmed = false;

  // 分析每行的特征
  const lineFeatures = lines.map((line, index) => ({
    text: line.trim(),
    index,
    length: line.trim().length,
    isEmpty: line.trim() === "",
    hasPrefaceMarker: prefaceMarkers.some((m) => line.trim().startsWith(m + "：") || line.trim().startsWith(m + ":")),
    hasPostscriptMarker: postscriptMarkers.some((m) => line.trim().startsWith(m + "：") || line.trim().startsWith(m + ":")),
    hasPrefaceKeywords: PREFACE_KEYWORDS.some((kw) => line.trim().includes(kw)),
    hasPostscriptKeywords: POSTSCRIPT_KEYWORDS.some((kw) => line.trim().includes(kw)),
    hasFirstPerson: ANCIENT_FIRST_PERSON.some((p) => line.trim().includes(p)),
  }));

  // 第一遍：标记明确的序跋标记
  for (const feature of lineFeatures) {
    if (feature.hasPrefaceMarker) {
      prefaceConfirmed = true;
      phase = "preface";
      const idx = feature.text.indexOf("：") >= 0 ? feature.text.indexOf("：") : feature.text.indexOf(":");
      preface.push(feature.text.slice(idx + 1).trim() || feature.text);
      continue;
    }

    if (feature.hasPostscriptMarker) {
      postscriptConfirmed = true;
      phase = "postscript";
      const idx = feature.text.indexOf("：") >= 0 ? feature.text.indexOf("：") : feature.text.indexOf(":");
      postscript.push(feature.text.slice(idx + 1).trim() || feature.text);
      continue;
    }

    // 如果是空行，可能是章节分隔
    if (feature.isEmpty) {
      if (phase === "preface" && preface.length > 0 && !prefaceConfirmed) {
        // 未确认的序，遇到空行可能结束
        const prefaceLen = preface.join("").length;
        if (prefaceLen < 150) {
          phase = "body";
        }
      }
      continue;
    }

    // 第二遍：基于上下文的智能识别
    if (phase === "body") {
      // 检测序的上下文特征
      if (!prefaceConfirmed && body.length === 0) {
        // 检查是否是序的特征
        const isIntroContext = checkIntroContext(feature, lineFeatures);
        if (isIntroContext) {
          phase = "preface";
        }
      }

      // 检测跋的上下文特征
      if (!postscriptConfirmed && !prefaceConfirmed) {
        const isPostscriptContext = checkPostscriptContext(feature, lineFeatures);
        if (isPostscriptContext) {
          phase = "postscript";
        }
      }
    }

    switch (phase) {
      case "preface":
        preface.push(lines[feature.index]);
        break;
      case "body":
        body.push(lines[feature.index]);
        break;
      case "postscript":
        postscript.push(lines[feature.index]);
        break;
    }
  }

  // 最终验证和调整
  return validateAndAdjust(preface, body, postscript, lines);
}

function checkIntroContext(feature: { text: string; index: number; hasFirstPerson: boolean; hasPrefaceKeywords: boolean }, lineFeatures: Array<{ text: string; length: number; isEmpty: boolean }>): boolean {
  // 必须满足：第一人称 + 序特征词
  if (!feature.hasFirstPerson && !feature.hasPrefaceKeywords) {
    return false;
  }

  // 查看后续几行是否有诗歌内容
  const lookAhead = lineFeatures.slice(feature.index + 1, feature.index + 6);
  const hasPoetry = lookAhead.some((f) => {
    if (f.isEmpty) return false;
    // 诗歌特征：短行，5-15字，以标点结尾
    return f.length >= 5 && f.length <= 18 && /[，。？！、]$/.test(f.text);
  });

  // 如果后续有诗歌，则当前行更可能是序
  if (hasPoetry) {
    return true;
  }

  // 如果没有诗歌，但有明显的序特征词，也认为是序
  if (feature.text.includes("序") || feature.text.includes("引") || feature.text.includes("前言")) {
    return true;
  }

  return false;
}

function checkPostscriptContext(feature: { text: string; index: number; length: number; hasPostscriptKeywords: boolean }, lineFeatures: Array<{ text: string; index: number; length: number; isEmpty: boolean }>): boolean {
  // 跋通常在结尾部分
  const positionRatio = feature.index / lineFeatures.length;
  if (positionRatio < 0.6) {
    return false; // 太靠前，不可能是跋
  }

  // 检查是否有跋的特征词
  if (!feature.hasPostscriptKeywords) {
    return false;
  }

  // 检查前面是否有诗歌内容
  const lookBack = lineFeatures.slice(Math.max(0, feature.index - 8), feature.index);
  const hasPoetryBefore = lookBack.some((f) => {
    if (f.isEmpty) return false;
    return f.length >= 5 && f.length <= 18 && /[，。？！、]$/.test(f.text);
  });

  if (hasPoetryBefore) {
    return true;
  }

  // 如果有明确的时间标记（时某年某月），也认为是跋
  if (/时\s*[元明清民国]?\s*[一二三四五六七八九十百千零\d]{1,4}年/.test(feature.text) ||
      /[一二三四五六七八九十百千零\d]{1,4}年\s*[正二三四五六七八九十冬腊]{1,2}月/.test(feature.text)) {
    return true;
  }

  return false;
}

function validateAndAdjust(preface: string[], body: string[], postscript: string[], lines: string[]): ContextAnalysis {
  const prefaceStr = preface.join("\n").trim();
  const bodyStr = body.join("\n").trim();
  const postscriptStr = postscript.join("\n").trim();

  // 规则1：序不能太长（最大5行或300字符）
  if (preface.length > 6 || prefaceStr.length > 350) {
    // 如果序太长，可能是正文的一部分
    return {
      preface: "",
      body: (preface.join("\n") + "\n" + bodyStr).trim(),
      postscript: postscriptStr,
    };
  }

  // 规则2：跋不能太短（至少15字符）
  if (postscriptStr.length < 15 && postscript.length <= 1) {
    return {
      preface: prefaceStr,
      body: (bodyStr + "\n" + postscript.join("\n")).trim(),
      postscript: "",
    };
  }

  // 规则3：如果序和跋都很短且相邻，合并到正文
  if (prefaceStr.length < 20 && postscriptStr.length < 20 && preface.length + postscript.length <= 2) {
    return {
      preface: "",
      body: (preface.join("\n") + "\n" + bodyStr + "\n" + postscript.join("\n")).trim(),
      postscript: "",
    };
  }

  // 规则4：检查序是否包含正文关键词
  const prefaceHasBodyKeywords = PREFACE_KEYWORDS.some((kw) => prefaceStr.includes(kw));
  if (!prefaceHasBodyKeywords && preface.length === 1 && prefaceStr.length > 50) {
    // 单行长序但没有序特征词，可能是正文
    return {
      preface: "",
      body: (preface.join("\n") + "\n" + bodyStr).trim(),
      postscript: postscriptStr,
    };
  }

  // 规则5：检查跋是否有时间标记
  const hasDateMarker = /时|岁|年|月|日/.test(postscriptStr);
  if (!hasDateMarker && postscript.length === 1 && !POSTSCRIPT_KEYWORDS.some((kw) => postscriptStr.includes(kw))) {
    // 单行跋但没有跋特征词和时间标记，可能是正文
    return {
      preface: prefaceStr,
      body: (bodyStr + "\n" + postscript.join("\n")).trim(),
      postscript: "",
    };
  }

  return {
    preface: prefaceStr,
    body: bodyStr,
    postscript: postscriptStr,
  };
}

// ═══════════════════════════════════════════════════════════
// Intelligent Deduplication Engine
// ═══════════════════════════════════════════════════════════

interface TextDiff {
  position: number;
  originalChar: string;
  newChar: string;
  type: "insert" | "delete" | "replace";
}

interface DuplicateDetail {
  type: "exact" | "similar";
  originalIndex: number;
  duplicateIndex: number;
  similarity: number;
  titleSimilarity: number;
  bodySimilarity: number;
  diffs?: TextDiff[];
  diffSummary: string;
}

interface ExistingDuplicateDetail extends DuplicateMatch {
  importedTitle: string;
  importedBodyPreview: string;
  existingBodyPreview: string;
}

function computeSimilarity(a: string, b: string): number {
  const cleanA = a.replace(/\s/g, "").toLowerCase();
  const cleanB = b.replace(/\s/g, "").toLowerCase();
  
  if (cleanA === cleanB) return 1.0;
  if (cleanA.length === 0 || cleanB.length === 0) return 0;

  const longer = cleanA.length > cleanB.length ? cleanA : cleanB;
  const shorter = cleanA.length > cleanB.length ? cleanB : cleanA;

  const longerLength = longer.length;
  const editDistance = levenshteinDistance(longer, shorter);
  
  return (longerLength - editDistance) / longerLength;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function computeDiffs(a: string, b: string): TextDiff[] {
  const cleanA = a.replace(/\s/g, "");
  const cleanB = b.replace(/\s/g, "");
  const diffs: TextDiff[] = [];
  
  const maxLen = Math.max(cleanA.length, cleanB.length);
  const minLen = Math.min(cleanA.length, cleanB.length);
  
  for (let i = 0; i < maxLen; i++) {
    const charA = i < cleanA.length ? cleanA[i] : "";
    const charB = i < cleanB.length ? cleanB[i] : "";
    
    if (charA !== charB) {
      if (charA === "") {
        diffs.push({ position: i, originalChar: "", newChar: charB, type: "insert" });
      } else if (charB === "") {
        diffs.push({ position: i, originalChar: charA, newChar: "", type: "delete" });
      } else {
        diffs.push({ position: i, originalChar: charA, newChar: charB, type: "replace" });
      }
    }
  }
  
  return diffs.slice(0, 20); // 限制差异数量
}

function generateDiffSummary(a: string, b: string, diffs: TextDiff[]): string {
  const insertions = diffs.filter((d) => d.type === "insert").length;
  const deletions = diffs.filter((d) => d.type === "delete").length;
  const replaces = diffs.filter((d) => d.type === "replace").length;
  
  const summaryParts: string[] = [];
  
  if (insertions > 0) summaryParts.push(`${insertions}处新增`);
  if (deletions > 0) summaryParts.push(`${deletions}处删除`);
  if (replaces > 0) summaryParts.push(`${replaces}处修改`);
  
  if (summaryParts.length === 0) {
    return "内容完全一致";
  }
  
  return summaryParts.join("，");
}

async function findDuplicates(articles: ParsedArticle[]): Promise<{
  duplicates: DuplicateDetail[];
  existingMatches: ExistingDuplicateDetail[];
}> {
  const duplicates: DuplicateDetail[] = [];
  const existingMatches: ExistingDuplicateDetail[] = [];

  // Check for duplicates among the imported articles
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const titleSim = computeSimilarity(articles[i].title, articles[j].title);
      const bodySim = computeSimilarity(articles[i].body, articles[j].body);
      const contentI = articles[i].title + articles[i].body;
      const contentJ = articles[j].title + articles[j].body;
      const similarity = computeSimilarity(contentI, contentJ);
      
      if (similarity >= 0.7) {
        let diffs: TextDiff[] | undefined;
        let diffSummary: string;
        
        if (similarity >= 0.95) {
          diffSummary = "内容完全一致";
        } else {
          diffs = computeDiffs(contentI, contentJ);
          diffSummary = generateDiffSummary(contentI, contentJ, diffs);
        }
        
        duplicates.push({
          type: similarity >= 0.95 ? "exact" : "similar",
          originalIndex: i,
          duplicateIndex: j,
          similarity,
          titleSimilarity: titleSim,
          bodySimilarity: bodySim,
          diffs,
          diffSummary,
        });
      }
    }
  }

  // Check against existing articles in database
  const existingArticles = await prisma.article.findMany({
    where: { source: "chuli" },
    select: { id: true, title: true, body: true },
  });

  for (const article of articles) {
    const content = article.title + article.body;
    for (const existing of existingArticles) {
      const existingContent = existing.title + existing.body;
      const similarity = computeSimilarity(content, existingContent);
      
      if (similarity >= 0.7) {
        existingMatches.push({
          type: similarity >= 0.95 ? "exact" : "similar",
          existingId: existing.id,
          existingTitle: existing.title,
          similarity,
          importedTitle: article.title,
          importedBodyPreview: article.body.slice(0, 100) + (article.body.length > 100 ? "..." : ""),
          existingBodyPreview: existing.body.slice(0, 100) + (existing.body.length > 100 ? "..." : ""),
        });
      }
    }
  }

  return { duplicates, existingMatches };
}

// ═══════════════════════════════════════════════════════════
// Intelligent Article Splitter
// ═══════════════════════════════════════════════════════════

type SplitResult = { blocks: string[]; strategy: string; confidence: number };

const TITLE_SUFFIXES = [
  "诗", "词", "曲", "赋", "歌", "行", "吟", "咏", "颂", "赞",
  "谣", "篇", "章", "首", "韵", "调", "令", "引", "操", "叹",
  "记", "序", "书", "论", "说", "表", "铭", "诔", "祭", "疏",
  "策", "檄", "判", "辩", "解", "传", "状", "箴", "戒", "敕",
  "文", "随笔", "日记", "杂感", "漫谈", "偶得", "杂言", "札记",
];

const TITLE_SUFFIX_PATTERN = new RegExp(
  `[${TITLE_SUFFIXES.join("")}]$|(${TITLE_SUFFIXES.filter((s) => s.length > 1).join("|")})$`
);

const NUMBER_PATTERNS = [
  /^其[一二三四五六七八九十]$/,
  /^[一二三四五六七八九十]、/,
  /^[①②③④⑤⑥⑦⑧⑨⑩]/,
  /^第[一二三四五六七八九十]+[首篇章]/,
];

function splitArticles(text: string, explicitSep?: string): SplitResult {
  const trimmed = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!trimmed) return { blocks: [], strategy: "空文本", confidence: 1 };

  const sep = explicitSep || (trimmed.includes("---") ? "---" : null);
  if (sep) {
    const blocks = splitBy(trimmed, sep);
    if (blocks.length > 1) {
      return { blocks, strategy: `分隔符 "${sep}" 拆分为 ${blocks.length} 篇`, confidence: 1.0 };
    }
  }

  const metaBlocks = splitByMetadataHeaders(trimmed);
  if (metaBlocks.length > 1) {
    return { blocks: metaBlocks, strategy: `元数据头 "标题：" 拆分为 ${metaBlocks.length} 篇`, confidence: 0.98 };
  }

  const structuralResult = splitByStructure(trimmed);
  if (structuralResult.blocks.length > 1) {
    return { blocks: structuralResult.blocks, strategy: structuralResult.strategy, confidence: 0.90 };
  }

  const titleResult = splitByTitleLine(trimmed);
  if (titleResult.length > 1) {
    return { blocks: titleResult, strategy: `标题模式识别拆分为 ${titleResult.length} 篇`, confidence: 0.75 };
  }

  const numberedBlocks = splitByNumberedItems(trimmed);
  if (numberedBlocks.length > 1) {
    return { blocks: numberedBlocks, strategy: `序号标记拆分为 ${numberedBlocks.length} 篇`, confidence: 0.70 };
  }

  return { blocks: [trimmed], strategy: "单篇导入（未检测到分篇标记）", confidence: 0.5 };
}

function splitBy(text: string, sep: string): string[] {
  return text.split(sep).map((b) => b.trim()).filter(Boolean);
}

function splitByMetadataHeaders(text: string): string[] {
  const lines = text.split("\n");
  const boundaries: number[] = [0];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("标题：") || line.startsWith("标题:")) {
      boundaries.push(i);
    }
  }
  if (boundaries.length <= 1) return [text];
  return sliceBlocks(lines, boundaries);
}

function splitByStructure(text: string): { blocks: string[]; strategy: string } {
  const lines = text.split("\n");
  const n = lines.length;

  type LineType = "empty" | "short" | "medium" | "long";
  const types: LineType[] = lines.map((l) => {
    const t = l.trim();
    if (!t) return "empty";
    if (t.length <= 12) return "short";
    if (t.length <= 40) return "medium";
    return "long";
  });

  const gapBoundaries: number[] = [];
  let emptyRun = 0;
  for (let i = 0; i < n; i++) {
    if (types[i] === "empty") {
      emptyRun++;
    } else {
      if (emptyRun >= 2 && gapBoundaries.length === 0) {
        gapBoundaries.push(i);
      } else if (emptyRun >= 2 && i - emptyRun > (gapBoundaries[gapBoundaries.length - 1] || 0) + 3) {
        gapBoundaries.push(i);
      }
      emptyRun = 0;
    }
  }

  if (gapBoundaries.length >= 1) {
    const boundaries = [0, ...gapBoundaries];
    const blocks = sliceBlocks(lines, boundaries);
    if (blocks.length > 1) {
      return { blocks, strategy: `段落空行拆分为 ${blocks.length} 篇` };
    }
  }

  const textureBoundaries: number[] = [];
  const WINDOW = 5;
  for (let i = WINDOW; i < n - WINDOW; i++) {
    const prevWindow = types.slice(i - WINDOW, i);
    const nextWindow = types.slice(i, i + WINDOW);

    const prevShortRatio = prevWindow.filter((t) => t === "short").length / WINDOW;
    const nextShortRatio = nextWindow.filter((t) => t === "short").length / WINDOW;

    if (prevShortRatio < 0.3 && nextShortRatio > 0.6 && lines[i - 1].trim() === "") {
      textureBoundaries.push(i);
    }
  }

  if (textureBoundaries.length >= 1) {
    const boundaries = [0, ...textureBoundaries];
    const blocks = sliceBlocks(lines, boundaries);
    if (blocks.length > 1) {
      return { blocks, strategy: `结构纹理分析拆分为 ${blocks.length} 篇` };
    }
  }

  return { blocks: [text], strategy: "" };
}

function splitByTitleLine(text: string): string[] {
  const lines = text.split("\n");
  const n = lines.length;

  const isShortLine = lines.map((l) => {
    const t = l.trim();
    return t.length > 0 && t.length <= 12;
  });

  function shortLineDensity(center: number, radius: number): number {
    let count = 0;
    let total = 0;
    for (let i = Math.max(0, center - radius); i < Math.min(n, center + radius + 1); i++) {
      const t = lines[i].trim();
      if (t) { total++; if (t.length <= 12) count++; }
    }
    return total > 0 ? count / total : 0;
  }

  interface Candidate { index: number; score: number; line: string; }
  const candidates: Candidate[] = [];

  for (let i = 0; i < n - 2; i++) {
    const line = lines[i].trim();
    if (!line || line.length > 20) continue;
    if (/[。！？…~]$/.test(line)) continue;

    let score = 0;

    if (TITLE_SUFFIX_PATTERN.test(line)) score += 2;
    if (line.length <= 6) score += 1;
    if (/^[一-鿿\s·•]+$/.test(line)) score += 2;
    if (/[·•]/.test(line)) score += 1;

    let nextContentLine = "";
    for (let j = i + 1; j < Math.min(i + 4, n); j++) {
      const nl = lines[j].trim();
      if (nl) { nextContentLine = nl; break; }
    }
    if (!nextContentLine) continue;

    if (nextContentLine.length >= line.length * 3) score += 2;
    else if (nextContentLine.length >= line.length * 1.5) score += 1;

    if (i > 0) {
      const prevLine = lines[i - 1].trim();
      if (prevLine === "") score += 1;
      if (/[。！？]$/.test(prevLine)) score += 1;
    } else {
      score += 2;
    }

    const localDensity = shortLineDensity(i, 4);
    const isInsidePoetry = localDensity > 0.6;

    if (isInsidePoetry) {
      const hasStrongSignal = TITLE_SUFFIX_PATTERN.test(line) || /[·•]/.test(line);
      const hasClearBoundary = i === 0 ||
        lines[i - 1].trim() === "" ||
        /[。！？]$/.test(lines[i - 1].trim());

      if (!hasStrongSignal || !hasClearBoundary) {
        score = Math.floor(score / 3);
      }
    }

    if (score < 2) continue;
    candidates.push({ index: i, score, line });
  }

  if (candidates.length === 0) return [text];

  const filtered: Candidate[] = [];
  for (const c of candidates) {
    const last = filtered[filtered.length - 1];
    if (!last || c.index - last.index >= 4) {
      filtered.push(c);
    } else if (c.score > last.score) {
      filtered[filtered.length - 1] = c;
    }
  }

  if (filtered.length <= 1) return [text];

  const boundaries = filtered.map((c) => c.index);
  const rawBlocks = sliceBlocks(lines, boundaries);

  const validBlocks = rawBlocks.filter((block) => {
    const contentLines = block.split("\n").filter((l) => l.trim());
    const totalChars = contentLines.reduce((s, l) => s + l.length, 0);
    return contentLines.length >= 3 || totalChars > 20;
  });

  if (validBlocks.length <= 1) return [text];
  return validBlocks;
}

function splitByNumberedItems(text: string): string[] {
  const lines = text.split("\n");
  const boundaries: number[] = [0];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (NUMBER_PATTERNS.some((p) => p.test(line))) {
      boundaries.push(i);
    }
  }
  if (boundaries.length <= 1) return [text];
  const blocks = sliceBlocks(lines, boundaries);
  return blocks.filter((b) => b.trim().length > 5);
}

function sliceBlocks(lines: string[], boundaries: number[]): string[] {
  const blocks: string[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : lines.length;
    const block = lines.slice(start, end).join("\n").trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

// ── Single Article Parsing ──

const METADATA_KEYS = ["标题", "类型", "日期", "标签", "序", "小序", "跋", "后记", "备注", "注", "正文"];

function isMetadataLine(line: string): { key: string; value: string } | null {
  for (const key of METADATA_KEYS) {
    if (line.startsWith(key + "：") || line.startsWith(key + ":")) {
      const value = line.slice(key.length + 1).trim();
      return { key, value };
    }
  }
  const m = line.match(/^([一-鿿]{2,4})[：:]\s*(.*)$/);
  if (m) {
    return { key: m[1], value: m[2] };
  }
  return null;
}

function autoTagFromContent(title: string, body: string, type: string): string[] {
  const tags: string[] = [];
  const combined = title + body.slice(0, 200);

  const keywordMap: Record<string, string> = {
    "秋": "秋天", "春": "春天", "夏": "夏天", "冬": "冬天",
    "雨": "雨", "雪": "雪", "风": "风", "月": "月",
    "山": "山水", "水": "山水", "花": "花", "鸟": "鸟",
    "夜": "夜", "酒": "酒", "梦": "梦",
    "送": "送别", "别": "送别", "赠": "赠答",
    "怀": "感怀", "感": "感怀", "思": "思念",
    "登": "登临", "游": "游记", "行": "行旅",
    "闲": "闲适", "隐": "隐逸", "归": "归隐",
  };

  for (const [char, tag] of Object.entries(keywordMap)) {
    if (combined.includes(char) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  if (type && type !== "文") tags.push(type);
  return tags.slice(0, 6);
}

function parseSingleArticle(block: string): ParsedArticle | null {
  const lines = block.trim().split("\n");
  const article: ParsedArticle = { title: "", type: "诗", tags: [], body: "", confidence: 0.7 };
  let headerEnded = false;
  let currentMetaKey: string | null = null;
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = isMetadataLine(line);

    if (!headerEnded) {
      if (kv) {
        if (kv.key === "正文") {
          headerEnded = true;
          if (kv.value) bodyLines.push(kv.value);
          continue;
        }

        switch (kv.key) {
          case "标题": article.title = kv.value; break;
          case "类型": article.type = kv.value; break;
          case "日期": article.dateRaw = kv.value; break;
          case "标签":
            article.tags = kv.value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
            break;
          case "序":
          case "小序":
            article.preface = (article.preface || "") + (article.preface ? "\n" : "") + kv.value;
            currentMetaKey = "preface";
            break;
          case "跋":
          case "后记":
            article.postscript = (article.postscript || "") + (article.postscript ? "\n" : "") + kv.value;
            currentMetaKey = "postscript";
            break;
          case "备注":
          case "注":
            article.notes = (article.notes || "") + (article.notes ? "\n" : "") + kv.value;
            currentMetaKey = "notes";
            break;
          default:
            if (i === 0 && kv.key.length <= 4) {
              article.title = kv.key + (kv.value ? "：" + kv.value : "");
            } else {
              headerEnded = true;
              bodyLines.push(line);
            }
        }
        currentMetaKey = null;
      } else if (line.trim() === "") {
        if (!currentMetaKey) {
          headerEnded = true;
        }
      } else if (currentMetaKey) {
        switch (currentMetaKey) {
          case "preface": article.preface = (article.preface || "") + "\n" + line; break;
          case "postscript": article.postscript = (article.postscript || "") + "\n" + line; break;
          case "notes": article.notes = (article.notes || "") + "\n" + line; break;
        }
      } else if (i === 0 && !article.title) {
        article.title = line.trim();
      } else {
        headerEnded = true;
        bodyLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }

  let content = bodyLines.join("\n").trim();

  // Apply contextual analysis for preface/postscript
  if (!article.preface && !article.postscript) {
    const context = analyzeContext(article.title, content);
    article.preface = context.preface;
    content = context.body;
    article.postscript = context.postscript;
  }

  article.body = content;

  // Auto-detect genre if not specified
  if (!article.type || article.type === "诗") {
    const genreResult = classifyGenre(article.title, article.body);
    article.type = genreResult.type;
    article.subType = genreResult.subType;
    article.confidence = genreResult.confidence;
    article.classificationReasons = genreResult.reasons;
  }

  if (!article.title && article.body) {
    const firstLine = lines.find((l) => l.trim());
    if (firstLine && firstLine.trim().length <= 25) {
      article.title = firstLine.trim();
      article.body = bodyLines.slice(1).join("\n").trim() || article.body;
    }
  }

  if (article.tags.length === 0) {
    article.tags = autoTagFromContent(article.title, article.body, article.type);
  }

  // Add sub-type tag if applicable
  if (article.subType && !article.tags.includes(article.subType)) {
    article.tags.push(article.subType);
  }

  if (article.title && article.body) return article;
  if (article.title && !article.body && block.trim().split("\n").length <= 2) {
    article.body = block.trim();
    article.tags = autoTagFromContent(article.title, article.body, article.type);
    return article;
  }
  return null;
}

// ── Main Export ──

export async function POST(request: NextRequest) {
  try {
    const { text, separator, defaultType, defaultTags, defaultStatus, autoAiWorkflow = true } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "请输入要导入的文本" }, { status: 400 });
    }

    const sep = typeof separator === "string" && separator.trim() ? separator.trim() : undefined;
    const { blocks, strategy } = splitArticles(text, sep);

    const parsedArticles: ParsedArticle[] = [];
    for (const block of blocks) {
      const article = parseSingleArticle(block);
      if (article) parsedArticles.push(article);
    }

    if (parsedArticles.length === 0) {
      return NextResponse.json({
        error: "未能解析出任何文章，请检查格式。尝试在每篇文章前添加「标题：文章名」",
      }, { status: 400 });
    }

    // Deduplication
    const { duplicates, existingMatches } = await findDuplicates(parsedArticles);

    // Mark duplicates for skipping
    const duplicateIndices = new Set<number>();
    const skipped: { reason: string; content: string; type?: string }[] = [];
    const importDuplicates: { 
      original: string; 
      duplicate: string; 
      type: "exact" | "similar";
      similarity: number;
      diffSummary: string;
    }[] = [];

    for (const dup of duplicates) {
      if (dup.similarity >= 0.95) {
        duplicateIndices.add(dup.duplicateIndex);
        skipped.push({
          reason: `与「${parsedArticles[dup.originalIndex].title}」内容完全一致（相似度100%）`,
          content: parsedArticles[dup.duplicateIndex].title,
          type: "duplicate",
        });
      } else {
        importDuplicates.push({
          original: parsedArticles[dup.originalIndex].title,
          duplicate: parsedArticles[dup.duplicateIndex].title,
          type: "similar",
          similarity: Math.round(dup.similarity * 100) / 100,
          diffSummary: dup.diffSummary,
        });
      }
    }

    // Filter out exact duplicates first
    let articlesToImport = parsedArticles.filter((_, index) => !duplicateIndices.has(index));

    // Check for existing articles matches and separate exact matches from similar ones
    const exactExistingMatches = existingMatches.filter((m) => m.type === "exact");
    const similarExistingMatches = existingMatches.filter((m) => m.type === "similar");

    for (const match of exactExistingMatches) {
      const idx = parsedArticles.findIndex((a) => a.title === match.importedTitle);
      if (idx !== -1 && !duplicateIndices.has(idx)) {
        duplicateIndices.add(idx);
        skipped.push({
          reason: `数据库中已存在相同文章「${match.existingTitle}」`,
          content: match.importedTitle,
          type: "existing_exact",
        });
      }
    }

    // Re-filter after checking existing articles
    articlesToImport = parsedArticles.filter((_, index) => !duplicateIndices.has(index));

    const created: { id: string; slug: string; title: string; type: string; subType?: string; confidence: number; classificationReasons?: string[] }[] = [];

    for (const article of articlesToImport) {
      const tagList = [...article.tags, ...(defaultTags || [])];
      
      // 生成基于内容的唯一slug：标题 + 内容哈希
      let slug = generateContentBasedSlug(article.title, article.body);
      
      // 检查数据库中是否已存在该slug（如果存在，说明内容完全重复）
      const existingArticle = await prisma.article.findUnique({
        where: { slug },
        select: { id: true, title: true },
      });
      
      if (existingArticle) {
        skipped.push({
          reason: `数据库中已存在相同内容的文章「${existingArticle.title}」（内容哈希匹配）`,
          content: article.title,
          type: "content_duplicate",
        });
        continue;
      }

      const created_article = await createArticleWithTags({
        data: {
          slug,
          title: article.title,
          author: SITE.authorName,
          source: "chuli",
          type: article.type || defaultType || "诗",
          dateRaw: article.dateRaw,
          preface: article.preface,
          body: article.body,
          postscript: article.postscript,
          notes: article.notes,
          status: defaultStatus || "draft",
          tagList: JSON.stringify(tagList),
        },
      }, tagList);

      created.push({
        id: created_article.id,
        slug: created_article.slug,
        title: created_article.title,
        type: article.type,
        subType: article.subType,
        confidence: Math.round(article.confidence * 100) / 100,
        classificationReasons: article.classificationReasons,
      });
    }

    const importTime = new Date().toISOString();
    const workflowBatchId = `chuli_import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workflowResults = autoAiWorkflow && created.length > 0
      ? await createArticleWorkflows(created.map((article) => article.id), {
        batchId: workflowBatchId,
        source: "chuli",
        policy: "import",
      })
      : [];
    
    return NextResponse.json({
      articles: created,
      aiWorkflow: {
        enabled: Boolean(autoAiWorkflow),
        batchId: autoAiWorkflow ? workflowBatchId : null,
        queued: workflowResults.filter((item) => item.status === "queued").length,
        failed: workflowResults.filter((item) => item.status === "failed").length,
      },
      duplicates: importDuplicates,
      skipped,
      existingMatches: similarExistingMatches.map((m) => ({
        type: m.type,
        existingId: m.existingId,
        existingTitle: m.existingTitle,
        importedTitle: m.importedTitle,
        similarity: Math.round(m.similarity * 100) / 100,
        importedBodyPreview: m.importedBodyPreview,
        existingBodyPreview: m.existingBodyPreview,
      })),
      count: created.length,
      strategy,
      totalBlocks: blocks.length,
      parsedArticlesCount: parsedArticles.length,
      importTime,
      importStats: {
        totalParsed: parsedArticles.length,
        successfullyImported: created.length,
        skippedCount: skipped.length,
        duplicateCount: importDuplicates.length + exactExistingMatches.length,
        similarMatchCount: similarExistingMatches.length,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
