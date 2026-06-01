import "server-only";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export async function generateUniqueSlug(text: string): Promise<string> {
  const baseSlug = generateSlug(text);
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = generateSlug(baseSlug, suffix);
    suffix++;
  }

  return candidate;
}
