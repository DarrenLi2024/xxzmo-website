import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "外部搜图已停用，请使用本地上传配图。" },
    { status: 410 }
  );
}
