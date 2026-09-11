const Router = require("@koa/router");
const router = new Router();

const ChatLLM = require("../LLM/index");
const model = new ChatLLM();

router.post("/chat", async (ctx) => {
  const { message, sessionId = "default" } = ctx.request.body || {};
  const userMessage = message || "你好，说一句话就行";

  const response = await model.getChat(sessionId, userMessage);
  console.log("response", response);
  ctx.body = { response };
  ctx.status = 200;
});

router.post("/chat/stream", async (ctx) => {
  const { message, sessionId } = ctx.request.body;
  // 关键：告诉 Koa 不要自动处理响应
  ctx.respond = false;
  ctx.status = 200;
  // SSE 响应头
  const res = ctx.res;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders(); // 立即发送头部，浏览器不会一直转圈

  // 监听客户端断开
  let clientClosed = false;
  ctx.req.on("close", () => {
    clientClosed = true;
  });

  try {
    const stream = model.getChatStream(sessionId || "default", message);

    for await (const chunk of stream) {
      if (clientClosed) {
        console.log("客户端已断开，停止流式输出");
        break;
      }
      // SSE 格式：data: {...}\n\n
      ctx.res.write(
        `data: ${JSON.stringify({ type: "chunk", delta: chunk })}\n\n`,
      );
    }

    if (!clientClosed) {
      ctx.res.write("data: [DONE]\n\n");
      ctx.res.end();
    }
  } catch (err) {
    console.error("[SSE Error]:", err.message);
    if (!clientClosed) {
      ctx.res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      ctx.res.end();
    }
  }
});

module.exports = router;
