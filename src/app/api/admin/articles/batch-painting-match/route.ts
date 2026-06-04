import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "批量自动配图已停用，请逐篇选择本地上传配图。" },
    { status: 410 }
  );
}
