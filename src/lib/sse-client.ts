/** 消费 OpenAI 兼容 SSE 流（data: {...} / data: [DONE]） */

export interface SseStreamHandlers {
  onToken?: (token: string) => void;
  onMeta?: (meta: Record<string, unknown>) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
}

export async function consumeOpenAiSseStream(
  response: Response,
  handlers: SseStreamHandlers
): Promise<string> {
  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const data = await response.json();
      message = typeof data.error === "string" ? data.error : message;
    } catch {
      // ignore
    }
    handlers.onError?.(message);
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("响应不支持流式读取");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as {
          type?: string;
          token?: string;
          error?: string;
          provider?: string;
          model?: string;
          durationMs?: number;
          logId?: string | null;
          choices?: Array<{ delta?: { content?: string } }>;
        };

        if (parsed.type === "meta") {
          handlers.onMeta?.(parsed as Record<string, unknown>);
          continue;
        }

        if (parsed.type === "error" && parsed.error) {
          handlers.onError?.(parsed.error);
          throw new Error(parsed.error);
        }

        const token =
          parsed.token ??
          parsed.choices?.[0]?.delta?.content ??
          "";

        if (token) {
          fullText += token;
          handlers.onToken?.(token);
        }
      } catch (error) {
        if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
          throw error;
        }
      }
    }
  }

  handlers.onDone?.(fullText);
  return fullText;
}
