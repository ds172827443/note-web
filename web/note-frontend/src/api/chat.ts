export interface ChatStreamParams {
  message: string;
  sessionId: string;
  signal?: AbortSignal;
  /** 每收到一个文本片段就回调一次 */
  onDelta: (delta: string) => void;
}

/** 流式调用后端大模型（SSE：data: {"type":"chunk","delta":"..."}） */
export async function sendChatStream({
  message,
  sessionId,
  signal,
  onDelta,
}: ChatStreamParams): Promise<void> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`请求失败：HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error("当前环境不支持流式响应");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          finished = true;
          break;
        }
        try {
          const data = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            error?: string;
          };
          if (data.error) throw new Error(data.error);
          if (typeof data.delta === "string" && data.delta.length > 0) {
            onDelta(data.delta);
          }
        } catch {
          // 单行不是合法 JSON（比如心跳），忽略即可
        }
      }
      if (finished) break;
    }
  }
}

/** 生成会话 id：换一个 id 即开启全新上下文（后端按 sessionId 存历史） */
export function createSessionId(): string {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
