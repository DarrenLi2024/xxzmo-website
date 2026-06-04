import Link from "next/link";
import { ImageIcon } from "lucide-react";

export default function YafenggePage() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-paper-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-paper-100 p-3 text-ink-500">
            <ImageIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif text-ink-900">雅风阁已停用</h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              系统配图已统一改为本地上传模式，不再使用 AI 搜图或外部图库导入。请在本地配图库上传 170:70 图片后，再到文章编辑页选择配图。
            </p>
            <Link
              href="/admin/paintings"
              className="mt-5 inline-flex rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-dim"
            >
              前往本地配图库
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
