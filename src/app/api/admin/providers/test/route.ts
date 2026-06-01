import { NextRequest, NextResponse } from "next/server";
import { testLlmConnection } from "@/lib/llm-service";
import { logAdminAction } from "@/lib/admin-log";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json(
      { success: false, message: "缺少 Provider ID" },
      { status: 400 }
    );
  }

  const result = await testLlmConnection(id);
  await logAdminAction({
    action: "provider.test",
    entityType: "llmProvider",
    entityId: id,
    summary: `${result.success ? "测试通过" : "测试失败"}：${result.message}`,
    metadata: { success: result.success, latencyMs: result.latencyMs, checkedAt: result.checkedAt },
  });
  return NextResponse.json(result);
}
