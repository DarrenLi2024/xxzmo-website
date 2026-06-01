export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-paper-50 rounded-lg p-6 space-y-3">
            <div className="h-6 bg-paper-200 rounded w-1/2" />
            <div className="h-4 bg-paper-200 rounded w-1/3" />
            <div className="h-4 bg-paper-200 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
