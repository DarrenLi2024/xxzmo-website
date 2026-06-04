import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "自动配图已停用，请使用本地上传配图。" },
    { status: 410 }
  );
}
