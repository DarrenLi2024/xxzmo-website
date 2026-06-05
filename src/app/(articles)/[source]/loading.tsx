export default function SourceLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 类型筛选栏骨架 */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-12 bg-paper-200 rounded-full shrink-0" />
        ))}
      </div>
      {/* 文章卡片骨架 */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-paper-50 rounded-lg p-5 space-y-3 animate-pulse">
            <div className="h-5 bg-paper-200 rounded w-3/4" />
            <div className="h-4 bg-paper-200 rounded w-1/3" />
            <div className="h-3 bg-paper-200 rounded w-full" />
            <div className="h-3 bg-paper-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
