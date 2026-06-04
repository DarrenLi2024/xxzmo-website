export default function AdminPaintingsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif text-ink-900">配图库管理</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-paper-50 border border-paper-200 rounded-lg p-4">
            <div className="aspect-[17/7] bg-paper-200 rounded mb-3 animate-pulse" />
            <div className="h-5 bg-paper-200 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-4 bg-paper-200 rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
