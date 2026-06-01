import { Metadata } from "next";

export const metadata: Metadata = { title: "关于" };

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif text-ink-900 mb-8">关于</h1>
      <div className="space-y-6 text-ink-700 prose-cn">
        <p>
          号<strong>狂野君</strong>，斋名<strong>山房主人</strong>。
        </p>
        <p>性喜山林，偶作诗文。</p>
        <p>
          此处名为<strong>闲心子墨</strong>，分为二部：一曰<strong>樗栎集</strong>，收录自作诗文；一曰<strong>辑古录</strong>，收藏前人经典。
        </p>
        <p className="font-kai text-ink-500 text-sm mt-12">
          &ldquo;樗栎本无用，天地一散人&rdquo;
        </p>
      </div>
    </div>
  );
}
