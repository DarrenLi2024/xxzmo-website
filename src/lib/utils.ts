import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(text: string, suffix?: string | number): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || Date.now().toString(36);
  
  if (suffix !== undefined) {
    slug = `${slug}-${suffix}`;
  }
  
  return slug;
}

export function generateContentBasedSlug(title: string, body: string): string {
  const normalizedContent = (title + "\n" + body)
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
  
  const hash = simpleHash(normalizedContent);
  const baseSlug = generateSlug(title);
  return `${baseSlug}-${hash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function slugToId(slug: string): string {
  return slug.split('-').pop() || slug
}
