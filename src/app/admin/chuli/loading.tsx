import { Skeleton } from "@/components/admin/Skeleton";

export default function AdminChuliLoading() {
  return (
    <div>
      <h2 className="text-2xl font-serif text-ink-900 mb-8">樗栎集管理</h2>
      <div className="bg-paper-50 border border-paper-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs text-ink-400 border-b border-paper-200 bg-paper-100">
          <span className="col-span-5">标题</span>
          <span className="col-span-2">类型</span>
          <span className="col-span-1">状态</span>
          <span className="col-span-2">标签</span>
          <span className="col-span-2 text-right">操作</span>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-paper-100">
            <div className="col-span-5 flex items-center gap-2">
              <div className="w-4 h-4 bg-paper-200 rounded" />
              <div className="h-5 bg-paper-200 rounded w-48" />
            </div>
            <div className="col-span-2 h-5 bg-paper-200 rounded w-12" />
            <div className="col-span-1">
              <div className="h-5 bg-paper-200 rounded-full w-12" />
            </div>
            <div className="col-span-2 h-4 bg-paper-200 rounded w-24" />
            <div className="col-span-2 flex justify-end gap-2">
              <div className="w-6 h-6 bg-paper-200 rounded" />
              <div className="w-6 h-6 bg-paper-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}