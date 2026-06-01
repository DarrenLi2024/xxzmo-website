import { RubyText } from '../RubyText';

interface PinyinMapItem {
  char: string;
  pinyin: string;
}

interface LineBreak {
  text: string;
  isNewLine: boolean;
  pinyinData: PinyinMapItem[];
}

interface TextSegment {
  text: string;
  start: number;
}

interface Props {
  articleId?: string;
  source?: string;
  type?: string;
  preface?: string | null;
  body: string;
  postscript?: string | null;
  notes?: string | null;
  pinyinData?: PinyinMapItem[];
  showPinyin?: boolean;
}

const punctuationPattern = /[，。！？；：,.!?;:]/;
const visualPunctuationPattern = /[，。、！？；：""''【】《》（）\s.]/g;
const sentenceEndPattern = /[。！？.!?]/;

type LineBreakMode = "poetry" | "parallelProse" | "plainProse";

const getLineLength = (text: string) => text.replace(visualPunctuationPattern, '').length;

const splitLineByMode = (line: string, lineStart: number, mode: LineBreakMode): TextSegment[] => {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const trimStart = line.search(/\S/);
  const contentStart = lineStart + Math.max(trimStart, 0);

  if (mode === "plainProse") return [{ text: trimmed, start: contentStart }];
  if (mode === "parallelProse") return splitParallelProseLine(trimmed, contentStart);

  return splitPoetryLine(trimmed, contentStart);
};

const splitParallelProseLine = (trimmed: string, contentStart: number): TextSegment[] => {
  if (!sentenceEndPattern.test(trimmed)) return [{ text: trimmed, start: contentStart }];

  const matches = Array.from(trimmed.matchAll(/.*?[。！？.!?]|.+$/gu))
    .map((match) => ({
      text: match[0].trim(),
      start: contentStart + (match.index || 0) + match[0].search(/\S/),
    }))
    .filter((item) => item.text);

  return matches.length > 0 ? matches : [{ text: trimmed, start: contentStart }];
};

const splitPoetryLine = (trimmed: string, contentStart: number): TextSegment[] => {
  if (!punctuationPattern.test(trimmed)) return [{ text: trimmed, start: contentStart }];

  const matches = Array.from(trimmed.matchAll(/.*?[，。！？；：,.!?;:]|.+$/gu))
    .map((match) => ({
      text: match[0].trim(),
      start: contentStart + (match.index || 0) + match[0].search(/\S/),
    }))
    .filter((item) => item.text);

  if (matches.length <= 1) return [{ text: trimmed, start: contentStart }];

  const merged: TextSegment[] = [];
  let buffer = '';
  let bufferStart = matches[0]?.start ?? contentStart;

  for (const segment of matches) {
    if (!buffer) bufferStart = segment.start;
    buffer += segment.text;
    const length = getLineLength(buffer);
    const sentenceEnd = /[。！？.!?]$/.test(segment.text);

    if (sentenceEnd || length >= 10) {
      merged.push({ text: buffer, start: bufferStart });
      buffer = '';
    }
  }

  if (buffer) merged.push({ text: buffer, start: bufferStart });

  return merged.length > 0 ? merged : [{ text: trimmed, start: contentStart }];
};

const slicePinyinByText = (text: string, pinyinData: PinyinMapItem[], startIndex: number) => {
  const chars = Array.from(text);
  return {
    data: pinyinData.slice(startIndex, startIndex + chars.length),
  };
};

const defaultSmartLineBreak = (text: string, pinyinData: PinyinMapItem[], mode: LineBreakMode): LineBreak[][] => {
  if (!text) return [];

  const paragraphs: LineBreak[][] = [];
  let currentParagraph: LineBreak[] = [];
  let textOffset = 0;

  for (const rawLine of text.split("\n")) {
    if (!rawLine.trim()) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
        currentParagraph = [];
      }
      textOffset += rawLine.length + 1;
      continue;
    }

    const lines = splitLineByMode(rawLine, textOffset, mode);
    for (const line of lines) {
      const { data } = slicePinyinByText(line.text, pinyinData, line.start);
      currentParagraph.push({ text: line.text, isNewLine: true, pinyinData: data });
    }

    textOffset += rawLine.length + 1;
  }

  if (currentParagraph.length > 0) paragraphs.push(currentParagraph);

  return paragraphs;
};

function getLineBreakMode(source?: string, type?: string): LineBreakMode {
  if (type === "文" || type === "赋" || type === "随笔" || type === "日记") return "plainProse";
  if (source === "jigu" && type !== "诗" && type !== "词" && type !== "曲") return "plainProse";
  return "poetry";
}

export function ArticleBody({ source, type, preface, body, postscript, notes, pinyinData = [], showPinyin = false }: Props) {
  const lineBreakMode = getLineBreakMode(source, type);
  const paragraphLines = defaultSmartLineBreak(body, pinyinData, lineBreakMode);

  return (
    <div className="w-full">
      {preface && preface.trim() && (
        <div className="preface-block">
          {preface.split("\n").map((line, i) => (
            <p key={i} className="indented-text">
              {line}
            </p>
          ))}
        </div>
      )}

      <div className={`article-poem-body font-serif text-sm md:text-base text-ink-900 leading-relaxed my-4 md:my-6 ${lineBreakMode === "plainProse" ? "plain-prose-body" : "space-y-2 md:space-y-3"} ${showPinyin ? 'pinyin-mode' : ''}`}>
        {paragraphLines.length > 0 ? (
          paragraphLines.map((lines, paraIndex) => (
            <p key={paraIndex} className={lineBreakMode === "plainProse" ? "m-0" : "m-0 space-y-1.5 md:space-y-2"}>
              {lines.map((line, lineIndex) => (
                <span key={lineIndex} className={lineBreakMode === "plainProse" ? "prose-line" : "poem-line"}>
                  <RubyText text={line.text} pinyinData={line.pinyinData} showPinyin={showPinyin} />
                </span>
              ))}
            </p>
          ))
        ) : (
          <p className="text-ink-400">暂无内容</p>
        )}
      </div>

      {postscript && postscript.trim() && (
        <div className="preface-block">
          {postscript.split("\n").map((line, i) => (
            <p key={i} className="indented-text">
              {line}
            </p>
          ))}
        </div>
      )}

      {notes && notes.trim() && (
        <div className="notes-block my-4 md:my-6">
          {notes}
        </div>
      )}
    </div>
  );
}
