/** 服务端 SSE 编码工具 */

export function encodeSseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function createSseStream(
  handler: (send: (data: unknown) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(encodeSseEvent(data)));
      };

      try {
        await handler(send);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "流式生成失败";
        controller.enqueue(encoder.encode(encodeSseEvent({ type: "error", error: message })));
      } finally {
        controller.close();
      }
    },
  });
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
