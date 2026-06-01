// 词牌名列表
const CI_PAI_NAMES = [
  "如梦令", "浣溪沙", "蝶恋花", "菩萨蛮", "清平乐", "西江月", "忆秦娥", "浪淘沙",
  "虞美人", "卜算子", "临江仙", "鹧鸪天", "鹊桥仙", "踏莎行", "声声慢", "念奴娇",
  "水调歌头", "满江红", "沁园春", "永遇乐", "贺新郎", "摸鱼儿", "木兰花", "采桑子",
  "苏幕遮", "破阵子", "渔家傲", "望海潮", "雨霖铃", "钗头凤", "南乡子",
  "玉楼春", "定风波", "江城子", "一剪梅", "霜天晓角",
];

const CI_PAI_PATTERN = new RegExp(`^(${CI_PAI_NAMES.join("|")})[··]?`);

const CI_PAI_TO_FORM: Record<string, { lines: number[]; chars: number[] }> = {
  "如梦令": { lines: [6, 6, 7, 6, 6, 7], chars: [6, 6, 7, 6, 6, 7] },
  "浣溪沙": { lines: [7, 7, 7, 7, 7, 7], chars: [7, 7, 7, 7, 7, 7] },
  "蝶恋花": { lines: [7, 7, 7, 7, 7, 7, 7, 7], chars: [7, 7, 7, 7, 7, 7, 7, 7] },
  "水调歌头": { lines: [9, 5, 9, 5, 9, 5, 5, 9, 5], chars: [9, 5, 9, 5, 9, 5, 5, 9, 5] },
  "念奴娇": { lines: [4, 4, 4, 4, 4, 4, 6, 4, 4], chars: [4, 4, 4, 4, 4, 4, 6, 4, 4] },
};

const FU_INDICATORS = ["赋", "辞"];
const ESSAY_INDICATORS = ["随笔", "杂记", "漫笔", "琐记"];
const NOVEL_INDICATORS = ["小说", "故事", "演义", "传奇"];

const POETRY_SUBTYPES = {
  yuefu: { pattern: /(行|歌|吟|引|曲)$/ },
  ancient: { pattern: /(怀古|古风|古意)$/ },
  doggerel: { pattern: /^[其之]一[、.]/ },
};

const MODERN_POETRY_INDICATORS = ["我", "你", "他", "她", "它", "的", "了", "着", "过", "在", "是", "有", "不", "也", "都", "很", "就", "要", "会", "能", "可以"];

// 序跋关键词
const PREFACE_KEYWORDS = [
  "序", "小序", "叙", "引言", "前言", "弁言", "题辞", "书前",
  "余读", "余观", "余闻", "余尝", "观夫", "尝思", "窃谓",
  "岁在", "时维", "维岁", "是岁", "孟春", "仲春", "季春",
  "孟夏", "仲夏", "季夏", "孟秋", "仲秋", "季秋", "孟冬", "仲冬", "季冬",
];

const POSTSCRIPT_KEYWORDS = [
  "跋", "后记", "书后", "附记", "识", "题跋", "尾记",
  "时", "岁次", "记于", "书于", "写于", "作于", "识于",
  "谨识", "谨记", "书此", "记之", "志之", "识以",
];

// 语义特征词 - 用于主题分析
const THEME_KEYWORDS: Record<string, string[]> = {
  nature: ["山", "水", "云", "月", "风", "雨", "雪", "花", "鸟", "草", "树", "松", "竹", "梅", "柳", "春", "夏", "秋", "冬", "江", "河", "湖", "海"],
  emotion: ["愁", "思", "念", "忆", "情", "恨", "爱", "悲", "喜", "怨", "怅", "叹", "怜", "惜", "伤", "乐", "欢", "忧", "感", "慨"],
  time: ["年", "月", "日", "时", "夜", "晨", "暮", "朝", "夕", "今", "昔", "古", "今", "往", "来", "岁", "秋", "春", "冬", "夏"],
  location: ["家", "园", "院", "亭", "台", "楼", "阁", "轩", "堂", "室", "斋", "馆", "寺", "庙", "宫", "殿", "路", "途", "旅", "行"],
  activity: ["读", "书", "饮", "酒", "游", "赏", "观", "听", "吟", "咏", "题", "赋", "作", "写", "记", "论", "说", "谈", "语"],
};

interface ParsedArticle {
  title: string;
  type: string;
  subType?: string;
  body: string;
  preface?: string;
  postscript?: string;
  confidence: number;
  classificationReasons?: string[];
  splitReason?: string;
}

interface SplitResult {
  blocks: string[];
  strategy: string;
  confidence?: number;
}

interface ContextAnalysis {
  preface: string;
  body: string;
  postscript: string;
  reason: string;
}

export function splitArticles(text: string, explicitSep?: string): SplitResult {
  const trimmed = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!trimmed) return { blocks: [], strategy: "空文本" };

  // 1. 显式分隔符（最高优先级）
  const sep = explicitSep || (trimmed.includes("---") ? "---" : null);
  if (sep) {
    const blocks = splitBy(trimmed, sep);
    if (blocks.length > 1) {
      return { blocks, strategy: `分隔符 "${sep}" 拆分为 ${blocks.length} 篇`, confidence: 1.0 };
    }
  }

  // 2. 元数据头拆分（高优先级）
  const metaBlocks = splitByMetaHeader(trimmed);
  if (metaBlocks.length > 1) {
    return { blocks: metaBlocks, strategy: `元数据头识别拆分为 ${metaBlocks.length} 篇`, confidence: 0.92 };
  }

  // 3. 智能语义分篇（新增）
  const semanticBlocks = splitBySemanticAnalysis(trimmed);
  if (semanticBlocks.length > 1) {
    return { blocks: semanticBlocks, strategy: `语义分析拆分为 ${semanticBlocks.length} 篇`, confidence: 0.88 };
  }

  // 4. 标题模式识别
  const titleBlocks = splitByTitleLine(trimmed);
  if (titleBlocks.length > 1) {
    return { blocks: titleBlocks, strategy: `标题模式识别拆分为 ${titleBlocks.length} 篇`, confidence: 0.9 };
  }

  // 5. 序号标记拆分
  const numberedBlocks = splitByNumberedItems(trimmed);
  if (numberedBlocks.length > 1) {
    return { blocks: numberedBlocks, strategy: `序号标记拆分为 ${numberedBlocks.length} 篇`, confidence: 0.85 };
  }

  // 6. 空行分隔（保底）
  const emptyLineBlocks = splitByEmptyLines(trimmed);
  if (emptyLineBlocks.length > 1) {
    return { blocks: emptyLineBlocks, strategy: `空行分隔拆分为 ${emptyLineBlocks.length} 篇`, confidence: 0.8 };
  }

  return { blocks: [trimmed], strategy: "未拆分（单篇）", confidence: 1.0 };
}

function splitBy(text: string, sep: string): string[] {
  return text.split(new RegExp(`\\s*${sep}\\s*`))
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function splitByEmptyLines(text: string): string[] {
  return text.split(/\n\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

const TITLE_SUFFIX_PATTERN = /(诗|词|赋|记|序|书|论|说|表|铭|传|状|疏|议|启|笺)$/;
const POETRY_TYPE_PREFIX = /^(五言绝句|七言绝句|五言律诗|七言律诗|五律|七律|五绝|七绝|古风|乐府|新诗|打油诗|现代诗|词|曲|赋|文|记|序|书)/;
const CI_PAI_STANDALONE = /^(如梦令|浣溪沙|蝶恋花|菩萨蛮|清平乐|西江月|忆秦娥|浪淘沙|虞美人|卜算子|临江仙|鹧鸪天|鹊桥仙|踏莎行|声声慢|念奴娇|水调歌头|满江红|沁园春|永遇乐|贺新郎|摸鱼儿|木兰花|采桑子|苏幕遮|破阵子|渔家傲|望海潮|雨霖铃|钗头凤|南乡子|玉楼春|定风波|江城子|一剪梅|霜天晓角)$/;

function splitByTitleLine(text: string): string[] {
  const lines = text.split("\n");
  const n = lines.length;
  
  if (n < 4) return [text];

  const candidates: { index: number; score: number; reason: string }[] = [];

  for (let i = 0; i < n; i++) {
    const line = lines[i].trim();
    if (!line || line.length > 15) continue;
    
    let score = 0;
    let reason = "";

    // 1. 词牌名 + 标题模式：如「清平乐·村居」「念奴娇·赤壁怀古」
    const ciPaiMatch = line.match(/^(.+?)[·•](.+)$/);
    if (ciPaiMatch) {
      const ciPaiName = ciPaiMatch[1];
      if (CI_PAI_NAMES.includes(ciPaiName) || CI_PAI_STANDALONE.test(ciPaiName)) {
        score = 10;
        reason = `词牌名「${ciPaiName}」`;
      }
    }

    // 2. 体裁前缀模式：如「五律·春正」「七绝·思家」「五言律诗·登高」
    const typePrefixMatch = line.match(/^(五言绝句|七言绝句|五言律诗|七言律诗|五律|七律|五绝|七绝|古风|乐府|新诗|打油诗|现代诗|词|曲)[·•](.+)$/);
    if (typePrefixMatch && score < 8) {
      score = 9;
      reason = `体裁前缀「${typePrefixMatch[1]}」`;
    }

    // 3. 直接是词牌名（如「水调歌头」单独出现）
    if (CI_PAI_STANDALONE.test(line) && score < 8) {
      score = 8;
      reason = `词牌名「${line}」`;
    }

    // 4. 传统标题后缀：诗/词/赋/记/序/书等
    if (TITLE_SUFFIX_PATTERN.test(line) && score < 5) {
      const suffixMatch = line.match(TITLE_SUFFIX_PATTERN);
      if (suffixMatch) {
        score = 5;
        reason = `标题后缀「${suffixMatch[1]}」`;
      }
    }

    // 5. 如果上面都没匹配，检查是否是潜在的标题（需要后续验证）
    if (score === 0 && line.length >= 2 && line.length <= 8) {
      // 检查后续行是否是诗文（整齐的句子，有韵律）
      const bodyStart = i + 1;
      if (bodyStart < n) {
        const nextLine = lines[bodyStart]?.trim() || "";
        const secondLine = lines[bodyStart + 1]?.trim() || "";
        
        // 诗文体：行尾有韵律符号，或者字数整齐
        const isPoetryLine = (l: string) => {
          const cleanLen = l.replace(/\s/g, "").length;
          return cleanLen > 0 && cleanLen <= 15 && (
            /[，。？！、；]$/.test(l) || 
            (cleanLen >= 4 && cleanLen <= 7) ||
            (cleanLen >= 5 && cleanLen <= 9)
          );
        };

        if (isPoetryLine(nextLine) && isPoetryLine(secondLine)) {
          score = 4;
          reason = "潜在标题（后续为诗文）";
        }
      }
    }

    if (score >= 4) {
      candidates.push({ index: i, score, reason });
    }
  }

  if (candidates.length === 0) return [text];

  // 去重：如果两个候选只差1行，保留得分更高的
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  
  const validCandidates: { index: number; score: number; reason: string }[] = [];
  for (const cand of candidates) {
    const tooClose = validCandidates.some(v => 
      v.score > cand.score && cand.index - v.index <= 2
    );
    if (!tooClose) {
      validCandidates.push(cand);
    }
  }

  validCandidates.sort((a, b) => a.index - b.index);
  
  // 构建分篇
  const indices = [0, ...validCandidates.map(c => c.index)].sort((a, b) => a - b);
  const blocks: string[] = [];

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i < indices.length - 1 ? indices[i + 1] : n;
    const block = lines.slice(start, end).join("\n").trim();
    if (block) blocks.push(block);
  }

  return blocks.length > 1 ? blocks : [text];
}

function splitByNumberedItems(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(其[一二三四五六七八九十]|[一二三四五六七八九十]、|[一二三四五六七八九十]．|\d+[、.])\s*/.test(trimmed)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n").trim());
      }
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n").trim());
  }

  return blocks.length > 1 ? blocks : [text];
}

function splitByMetaHeader(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (/^[标题类型日期标签序跋注备注]：/.test(line.trim())) {
      if (currentBlock.length > 0) {
        const trimmed = currentBlock.join("\n").trim();
        if (trimmed) blocks.push(trimmed);
      }
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    const trimmed = currentBlock.join("\n").trim();
    if (trimmed) blocks.push(trimmed);
  }

  return blocks.length > 1 ? blocks : [text];
}

// 语义分析分篇（新增）
function splitBySemanticAnalysis(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length < 8) return [text];

  const paragraphs: { start: number; end: number; text: string; features: Record<string, number> }[] = [];
  let currentPara: string[] = [];

  // 先按空行分段
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "" && currentPara.length > 0) {
      const paraText = currentPara.join("\n");
      paragraphs.push({
        start: i - currentPara.length,
        end: i,
        text: paraText,
        features: extractFeatures(paraText),
      });
      currentPara = [];
    } else if (lines[i].trim() !== "") {
      currentPara.push(lines[i]);
    }
  }
  
  if (currentPara.length > 0) {
    const paraText = currentPara.join("\n");
    paragraphs.push({
      start: lines.length - currentPara.length,
      end: lines.length,
      text: paraText,
      features: extractFeatures(paraText),
    });
  }

  if (paragraphs.length < 2) return [text];

  // 计算段落间的语义相似度
  const splitPoints: number[] = [];
  
  for (let i = 0; i < paragraphs.length - 1; i++) {
    const sim = calculateSemanticSimilarity(paragraphs[i], paragraphs[i + 1]);
    if (sim < 0.4) {
      splitPoints.push(i + 1);
    }
  }

  if (splitPoints.length === 0) return [text];

  // 根据分割点划分
  const blocks: string[] = [];
  let lastIdx = 0;
  
  for (const idx of splitPoints) {
    const block = paragraphs.slice(lastIdx, idx).map(p => p.text).join("\n\n");
    if (block.trim()) blocks.push(block.trim());
    lastIdx = idx;
  }
  
  const lastBlock = paragraphs.slice(lastIdx).map(p => p.text).join("\n\n");
  if (lastBlock.trim()) blocks.push(lastBlock.trim());

  return blocks.length > 1 ? blocks : [text];
}

function extractFeatures(text: string): Record<string, number> {
  const features: Record<string, number> = {
    nature: 0, emotion: 0, time: 0, location: 0, activity: 0,
    charCount: text.length,
    lineCount: text.split("\n").length,
    avgLineLen: text.split("\n").filter(l => l.trim()).length > 0 
      ? text.length / text.split("\n").filter(l => l.trim()).length 
      : 0,
  };

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        features[theme as keyof typeof features]++;
      }
    }
  }

  return features;
}

function calculateSemanticSimilarity(p1: { features: Record<string, number> }, p2: { features: Record<string, number> }): number {
  let sum = 0;
  let maxSum = 0;
  
  for (const theme of ["nature", "emotion", "time", "location", "activity"]) {
    const f1 = p1.features[theme] || 0;
    const f2 = p2.features[theme] || 0;
    sum += Math.min(f1, f2);
    maxSum += Math.max(f1, f2, 1);
  }

  // 体裁一致性
  const lenDiff = Math.abs(p1.features.avgLineLen - p2.features.avgLineLen);
  const lenScore = lenDiff < 10 ? 0.3 : lenDiff < 20 ? 0.15 : 0;

  return (sum / maxSum) * 0.7 + lenScore;
}

export function parseSingleArticle(text: string, defaultType: string): ParsedArticle {
  const lines = text.split("\n");
  const article: ParsedArticle = {
    title: "",
    type: defaultType,
    body: "",
    confidence: 0.7,
  };

  let headerEnded = false;
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!headerEnded) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        headerEnded = true;
        continue;
      }

      const kvMatch = trimmed.match(/^([\u4e00-\u9fa5]{1,4})[:：]\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        const value = kvMatch[2];
        
        switch (key) {
          case "标题": article.title = value; break;
          case "类型": article.type = value; break;
          case "序": case "小序": case "引言": article.preface = value; break;
          case "跋": case "后记": article.postscript = value; break;
          default:
            if (i === 0 && key.length <= 4) {
              article.title = key + (value ? "：" + value : "");
            } else {
              headerEnded = true;
              bodyLines.push(line);
            }
        }
      } else if (i === 0 && !article.title) {
        article.title = trimmed;
      } else {
        headerEnded = true;
        bodyLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }

  // 语义分析：识别序跋
  const content = bodyLines.join("\n").trim();
  const context = analyzeContext(article.title, content);
  article.preface = article.preface || context.preface;
  article.body = context.body;
  article.postscript = article.postscript || context.postscript;

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

  if (!article.title) {
    article.title = "无题";
  }

  return article;
}

// 上下文语义分析 - 识别序和跋
function analyzeContext(title: string, content: string): ContextAnalysis {
  const result: ContextAnalysis = {
    preface: "",
    body: content,
    postscript: "",
    reason: "未检测到序跋",
  };

  const paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(p => p);
  if (paragraphs.length < 2) return result;

  // 分析开头是否为序
  const firstPara = paragraphs[0];
  const prefaceScore = calculatePrefaceScore(firstPara, title);
  
  if (prefaceScore >= 0.6 && firstPara.length < 500) {
    // 检查是否是独立的序（不是正文的一部分）
    const secondPara = paragraphs[1];
    const isPoetry = checkIfPoetry(secondPara);
    
    if (isPoetry || calculatePrefaceScore(secondPara, title) < 0.3) {
      result.preface = firstPara;
      result.body = paragraphs.slice(1).join("\n\n");
      result.reason = `开头段落序特征得分 ${Math.round(prefaceScore * 100)}%，判定为序`;
      return result;
    }
  }

  // 分析结尾是否为跋
  const lastPara = paragraphs[paragraphs.length - 1];
  const postscriptScore = calculatePostscriptScore(lastPara);
  
  if (postscriptScore >= 0.5 && lastPara.length < 500) {
    // 检查前面是否是正文
    const prevPara = paragraphs[paragraphs.length - 2];
    const isPrevPoetry = checkIfPoetry(prevPara);
    
    if (isPrevPoetry || calculatePostscriptScore(prevPara) < 0.3) {
      result.postscript = lastPara;
      result.body = paragraphs.slice(0, -1).join("\n\n");
      result.reason = `结尾段落跋特征得分 ${Math.round(postscriptScore * 100)}%，判定为跋`;
      return result;
    }
  }

  // 检查是否有明确的序跋标记
  const prefaceMarker = content.match(/^(序|小序|引言|前言|弁言)[：:]?\s*/);
  if (prefaceMarker) {
    const afterMarker = content.slice(prefaceMarker[0].length);
    const prefaceEnd = afterMarker.search(/\n\n|。\n/);
    if (prefaceEnd > 0 && prefaceEnd < 500) {
      result.preface = afterMarker.slice(0, prefaceEnd).trim();
      result.body = afterMarker.slice(prefaceEnd).trim();
      result.reason = `检测到「${prefaceMarker[1]}」标记`;
      return result;
    }
  }

  const postscriptMarker = content.match(/(跋|后记|书后|附记)[：:]?\s*$/m);
  if (postscriptMarker) {
    const beforeMarker = content.slice(0, content.lastIndexOf(postscriptMarker[0]));
    const postscriptStart = beforeMarker.lastIndexOf("\n\n");
    if (postscriptStart > 0) {
      result.postscript = content.slice(postscriptStart).trim();
      result.body = content.slice(0, postscriptStart).trim();
      result.reason = `检测到「${postscriptMarker[1]}」标记`;
      return result;
    }
  }

  return result;
}

function calculatePrefaceScore(text: string, title: string): number {
  let score = 0;
  let checks = 0;

  // 长度检查
  checks++;
  if (text.length < 400) score += 0.2;

  // 关键词匹配
  checks++;
  const keywordCount = PREFACE_KEYWORDS.filter(kw => text.includes(kw)).length;
  score += Math.min(keywordCount * 0.1, 0.4);

  // 时间标记
  checks++;
  if (/^(岁在|时维|维岁|是岁)/.test(text)) score += 0.2;

  // 作者自述
  checks++;
  if (/余[读观闻尝]|观夫|尝思|窃谓/.test(text)) score += 0.2;

  // 标题引用
  checks++;
  if (text.includes(title) && text.length < 200) score += 0.2;

  return score / checks;
}

function calculatePostscriptScore(text: string): number {
  let score = 0;
  let checks = 0;

  // 长度检查
  checks++;
  if (text.length < 300) score += 0.2;

  // 关键词匹配
  checks++;
  const keywordCount = POSTSCRIPT_KEYWORDS.filter(kw => text.includes(kw)).length;
  score += Math.min(keywordCount * 0.15, 0.4);

  // 时间落款
  checks++;
  if (/^(时|岁次|记于|书于|写于|作于)/.test(text)) score += 0.2;

  // 识、记等结尾词
  checks++;
  if (/[识记志]于?$/.test(text.replace(/\s/g, ""))) score += 0.2;

  return score / checks;
}

function checkIfPoetry(text: string): boolean {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return false;

  const cleanLines = lines.map(l => l.replace(/\s/g, ""));
  const avgLen = cleanLines.reduce((sum, l) => sum + l.length, 0) / cleanLines.length;
  
  // 检查是否有韵律
  const hasRhythm = cleanLines.some(l => /[，。？！、]$/.test(l));
  
  // 检查是否有固定格式
  const hasFixedLen = cleanLines.every(l => Math.abs(l.length - avgLen) <= 2);
  
  return (lines.length >= 2 && lines.length <= 16) && (hasRhythm || hasFixedLen);
}

function classifyGenre(title: string, body: string): { type: string; subType: string; confidence: number; reasons: string[] } {
  const lines = body.trim().split("\n").filter((l) => l.trim());
  const charCount = body.replace(/\s/g, "").length;
  const avgLineLen = lines.length > 0 ? charCount / lines.length : 0;
  const trimmedTitle = title.trim();
  const reasons: string[] = [];

  const ciPaiMatch = trimmedTitle.match(CI_PAI_PATTERN);
  if (ciPaiMatch) {
    const ciPaiName = ciPaiMatch[1];
    reasons.push(`标题识别到词牌名「${ciPaiName}」`);
    return { type: "词", subType: ciPaiName, confidence: 0.92, reasons };
  }

  if (FU_INDICATORS.some((ind) => trimmedTitle.includes(ind))) {
    reasons.push(`标题包含赋特征词「${FU_INDICATORS.find(ind => trimmedTitle.includes(ind))}」`);
    return { type: "赋", subType: "", confidence: 0.92, reasons };
  }

  const proseSuffixMatch = trimmedTitle.match(/(.+)(记|序|书|论|说|表|铭|传|状|疏|议|启|笺)$/);
  if (proseSuffixMatch) {
    const suffix = proseSuffixMatch[2];
    reasons.push(`标题后缀为「${suffix}」，判定为文`);
    return { type: "文", subType: suffix, confidence: 0.88, reasons };
  }

  if (ESSAY_INDICATORS.some((ind) => trimmedTitle.includes(ind))) {
    reasons.push(`标题包含随笔特征词`);
    return { type: "随笔", subType: "", confidence: 0.92, reasons };
  }

  if (lines.length >= 2) {
    const cleanLines = lines.map((l) => l.replace(/\s/g, ""));
    
    if (lines.length === 4 && cleanLines.every((l) => l.length === 7)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合七言绝句格式`);
      return { type: "诗", subType: "七言绝句", confidence: 0.98, reasons };
    }
    
    if (lines.length === 4 && cleanLines.every((l) => l.length === 5)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合五言绝句格式`);
      return { type: "诗", subType: "五言绝句", confidence: 0.98, reasons };
    }
    
    if (lines.length === 8 && cleanLines.every((l) => l.length === 7)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合七言律诗格式`);
      return { type: "诗", subType: "七言律诗", confidence: 0.97, reasons };
    }
    
    if (lines.length === 8 && cleanLines.every((l) => l.length === 5)) {
      reasons.push(`共${lines.length}行，每行${cleanLines[0].length}字，符合五言律诗格式`);
      return { type: "诗", subType: "五言律诗", confidence: 0.97, reasons };
    }
    
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
    
    if (POETRY_SUBTYPES.yuefu.pattern.test(trimmedTitle)) {
      reasons.push(`标题包含乐府特征词尾`);
      return { type: "诗", subType: "乐府", confidence: 0.90, reasons };
    }
    
    if (lines.length >= 6 && lines.length <= 16) {
      reasons.push(`共${lines.length}行，字数不一，无严格格律，判定为古风`);
      return { type: "诗", subType: "古风", confidence: 0.82, reasons };
    }
    
    if (POETRY_SUBTYPES.doggerel.pattern.test(lines[0])) {
      reasons.push(`首行以序号开头，判定为打油诗`);
      return { type: "诗", subType: "打油诗", confidence: 0.85, reasons };
    }
    
    const modernScore = lines.reduce((score, line) => {
      return score + MODERN_POETRY_INDICATORS.filter((ind) => line.includes(ind)).length;
    }, 0);
    
    if (lines.length >= 4) {
      const hasFreeForm = cleanLines.some((l) => l.length > 20) && cleanLines.some((l) => l.length <= 5);
      const hasModernWords = modernScore >= lines.length;
      
      if (hasFreeForm || hasModernWords) {
        const yearMatch = trimmedTitle.match(/^\d{4}/);
        if (yearMatch) {
          reasons.push(`标题以年份开头，判定为新诗`);
          return { type: "诗", subType: "新诗", confidence: 0.90, reasons };
        }
        if (hasFreeForm) reasons.push("行数长短不一，符合新诗自由体特征");
        if (hasModernWords) reasons.push("包含较多现代语言特征词");
        return { type: "诗", subType: "新诗", confidence: 0.80, reasons };
      }
    }
    
    if (lines.length >= 2 && lines.length <= 10) {
      const avgChars = cleanLines.reduce((s, l) => s + l.length, 0) / cleanLines.length;
      if (avgChars >= 5 && avgChars <= 15) {
        const hasRhythm = cleanLines.every((l) => /[，。？！、]$/.test(l));
        if (hasRhythm) {
          reasons.push(`共${lines.length}行，有韵律，判定为词`);
          return { type: "词", subType: "", confidence: 0.78, reasons };
        }
      }
    }
    
    if (charCount > 200 || lines.some((l) => l.length > 30)) {
      reasons.push(`内容较长(${charCount}字)，判定为文`);
      return { type: "文", subType: "", confidence: 0.85, reasons };
    }
  }

  reasons.push("未检测到明确特征，默认归类为诗");
  return { type: "诗", subType: "", confidence: 0.70, reasons };
}

interface DuplicateItem {
  original: string;
  duplicate: string;
  type: "exact" | "similar";
  similarity: number;
  diffSummary: string;
}

export function findDuplicates(articles: { title: string; body: string }[]): DuplicateItem[] {
  const duplicates: DuplicateItem[] = [];
  const n = articles.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = articles[i];
      const b = articles[j];
      
      const similarity = calculateSimilarity(a.body, b.body);
      
      if (similarity >= 0.95) {
        duplicates.push({
          original: a.title,
          duplicate: b.title,
          type: "exact",
          similarity,
          diffSummary: "内容高度相似",
        });
      } else if (similarity >= 0.7) {
        duplicates.push({
          original: a.title,
          duplicate: b.title,
          type: "similar",
          similarity,
          diffSummary: "内容存在差异，建议人工比对",
        });
      }
    }
  }

  return duplicates;
}

function calculateSimilarity(a: string, b: string): number {
  const cleanA = a.replace(/\s/g, "");
  const cleanB = b.replace(/\s/g, "");
  
  if (!cleanA || !cleanB) return 0;
  
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
