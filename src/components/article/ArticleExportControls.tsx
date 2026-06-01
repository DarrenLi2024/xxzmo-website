"use client";

import { Download, Minus, Plus } from "lucide-react";

export type ExportScriptMode = "original" | "simplified" | "traditional";

export interface ExportOptions {
  annotations: boolean;
  translation: boolean;
  appreciation: boolean;
  pinyin: boolean;
  fontScale: number;
  scriptMode: ExportScriptMode;
}

interface Props {
  value: ExportOptions;
  hasAnnotations: boolean;
  hasTranslation: boolean;
  hasAppreciation: boolean;
  hasPinyin: boolean;
  isScriptConverting: boolean;
  onChange: (value: ExportOptions) => void;
  onScriptModeChange: (mode: ExportScriptMode) => void;
  onPrint: () => void;
}

export function ArticleExportControls({
  value,
  hasAnnotations,
  hasTranslation,
  hasAppreciation,
  hasPinyin,
  isScriptConverting,
  onChange,
  onScriptModeChange,
  onPrint,
}: Props) {
  const update = (patch: Partial<ExportOptions>) => onChange({ ...value, ...patch });

  return (
    <section className="pdf-export-controls my-8 rounded border border-paper-200 bg-paper-50 px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-ink-900">PDF 内容</span>
        <label className="inline-flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked readOnly className="h-4 w-4 accent-[var(--color-accent)]" />
          正文
        </label>
        <ExportCheckbox label="译文" checked={value.translation} disabled={!hasTranslation} onChange={(checked) => update({ translation: checked })} />
        <ExportCheckbox label="注释" checked={value.annotations} disabled={!hasAnnotations} onChange={(checked) => update({ annotations: checked })} />
        <ExportCheckbox label="赏析" checked={value.appreciation} disabled={!hasAppreciation} onChange={(checked) => update({ appreciation: checked })} />
        <ExportCheckbox label="拼音" checked={value.pinyin} disabled={!hasPinyin} onChange={(checked) => update({ pinyin: checked })} />

        <div className="inline-flex items-center gap-1 text-sm text-ink-700" aria-label="PDF 简繁切换">
          <span className="mr-1">字形</span>
          {([
            ["original", "原文"],
            ["simplified", "简体"],
            ["traditional", "繁体"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              disabled={isScriptConverting}
              onClick={() => onScriptModeChange(mode)}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                value.scriptMode === mode
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-paper-200 text-ink-500 hover:bg-paper-100"
              } disabled:opacity-50`}
              aria-pressed={value.scriptMode === mode}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-ink-700">字号</span>
          <button
            type="button"
            onClick={() => update({ fontScale: Math.max(0.85, Number((value.fontScale - 0.1).toFixed(2))) })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-paper-200 bg-background text-ink-700 hover:bg-paper-100"
            aria-label="减小字号"
          >
            <Minus size={15} />
          </button>
          <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md bg-paper-100 px-2 text-sm text-ink-900">
            {value.fontScale.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={() => update({ fontScale: Math.min(1.3, Number((value.fontScale + 0.1).toFixed(2))) })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-paper-200 bg-background text-ink-700 hover:bg-paper-100"
            aria-label="增大字号"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        {isScriptConverting && <span className="mr-3 self-center text-xs text-ink-400">转换中...</span>}
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-md bg-ink-700 px-5 py-2.5 text-sm font-medium text-paper-50 hover:bg-ink-900"
        >
          <Download size={16} />
          打印PDF
        </button>
      </div>
    </section>
  );
}

function ExportCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${disabled ? "text-ink-300" : "text-ink-700"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--color-accent)] disabled:opacity-40"
      />
      {label}
    </label>
  );
}
