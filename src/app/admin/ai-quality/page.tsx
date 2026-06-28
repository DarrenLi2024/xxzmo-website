import { Metadata } from "next";
import { AiQualityDashboard } from "@/components/admin/AiQualityDashboard";

export const metadata: Metadata = {
  title: "AI 质量看板",
};

export default function AiQualityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">AI 质量看板</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prompt 版本成功率、人工反馈采纳率与流水线决策分布
        </p>
      </div>
      <AiQualityDashboard />
    </div>
  );
}
