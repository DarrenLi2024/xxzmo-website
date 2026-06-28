import { Metadata } from "next";
import { AiReviewQueue } from "@/components/admin/AiReviewQueue";

export const metadata: Metadata = {
  title: "AI 复核队列",
};

export default function AiReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">AI 复核队列</h1>
        <p className="text-sm text-muted-foreground mt-1">
          低置信度、去重冲突或校审风险的文章，需人工确认后发布
        </p>
      </div>
      <AiReviewQueue />
    </div>
  );
}
