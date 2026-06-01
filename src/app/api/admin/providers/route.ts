import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-log";
import { z } from "zod";

const updateSchema = z.object({
  id: z.string().min(1),
  baseUrl: z.string().url().optional(),
  model: z.string().trim().min(1).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
  apiKey: z.string().trim().min(1).nullable().optional(),
}).strict();

function publicProvider<T extends { apiKey: string | null }>(provider: T) {
  const { apiKey, ...safeProvider } = provider;
  return { ...safeProvider, hasApiKey: Boolean(apiKey) };
}

export async function GET() {
  const providers = await prisma.llmProvider.findMany({
    orderBy: { priority: "asc" },
  });
  return NextResponse.json(providers.map(publicProvider));
}

export async function PUT(request: NextRequest) {
  const result = updateSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: "配置参数无效" }, { status: 400 });
  }

  const { id, ...data } = result.data;
  const provider = await prisma.llmProvider.update({
    where: { id },
    data,
  });

  if (provider.name.startsWith("deepseek") && data.apiKey !== undefined) {
    await prisma.llmProvider.updateMany({
      where: { name: { startsWith: "deepseek" }, id: { not: id } },
      data: { apiKey: data.apiKey },
    });
  }

  await logAdminAction({
    action: "provider.update",
    entityType: "llmProvider",
    entityId: provider.id,
    summary: `更新 LLM Provider「${provider.label}」`,
    metadata: { fields: Object.keys(data).filter((key) => key !== "apiKey") },
  });
  return NextResponse.json(publicProvider(provider));
}
