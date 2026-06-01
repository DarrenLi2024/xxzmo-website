export default function AdminTagsLoading() {
  return (
    <div>
      <h2 className="text-2xl font-serif text-ink-900 mb-8">标签管理</h2>
      <div className="bg-paper-50 border border-paper-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-paper-100 border-b border-paper-200">
          <div className="h-4 bg-paper-200 rounded w-48 animate-pulse" />
        </div>
        <div className="divide-y divide-paper-100">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 bg-paper-200 rounded w-24 animate-pulse" />
                <div className="h-4 bg-paper-200 rounded w-12 animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-6 bg-paper-200 rounded animate-pulse" />
                <div className="w-6 h-6 bg-paper-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}