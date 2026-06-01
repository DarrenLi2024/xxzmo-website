"use client";

interface PinyinMapItem {
  char: string;
  pinyin: string;
}

interface RubyTextProps {
  text: string;
  pinyinData?: PinyinMapItem[];
  showPinyin?: boolean;
  className?: string;
}

export function RubyText({ text, pinyinData, showPinyin = true, className = '' }: RubyTextProps) {
  const displayText = Array.from(text);
  const displayPinyin = alignPinyin(displayText, pinyinData || []);

  if (!showPinyin) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`ruby-container ${className}`}>
      {displayText.map((char, index) => {
        const py = displayPinyin[index] || '';
        return (
          <ruby key={index}>
            {char}
            <rt>{py || '\u00a0'}</rt>
          </ruby>
        );
      })}
    </span>
  );
}

function alignPinyin(chars: string[], pinyinData: PinyinMapItem[]): string[] {
  if (pinyinData.length === 0) return chars.map(() => '');

  const aligned: string[] = [];
  let pinyinIndex = 0;

  for (const char of chars) {
    const direct = pinyinData[pinyinIndex];
    if (direct?.char === char) {
      aligned.push(direct.pinyin || '');
      pinyinIndex += 1;
      continue;
    }

    const nextMatch = pinyinData
      .slice(pinyinIndex + 1, pinyinIndex + 8)
      .findIndex((item) => item.char === char);

    if (nextMatch >= 0) {
      const matched = pinyinData[pinyinIndex + nextMatch + 1];
      aligned.push(matched.pinyin || '');
      pinyinIndex += nextMatch + 2;
      continue;
    }

    aligned.push('');
    if (/[\p{P}\p{S}\s]/u.test(char) && direct && /[\p{P}\p{S}\s]/u.test(direct.char)) {
      pinyinIndex += 1;
    }
  }

  return aligned;
}

export function PinyinToggle({ showPinyin, onToggle }: { showPinyin: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${
        showPinyin
          ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15'
          : 'border-paper-200 bg-paper-50 text-ink-700 hover:bg-paper-100'
      }`}
    >
      {showPinyin ? '隐藏拼音' : '显示拼音'}
    </button>
  );
}
