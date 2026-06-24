type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith("/")) {
    return src;
  }

  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
  });

  return `/_next/image?${params.toString()}`;
}
