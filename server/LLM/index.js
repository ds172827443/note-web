const { ChatOpenAI } = require("@langchain/openai");
const {
  HumanMessage,
  SystemMessage,
  AIMessage,
} = require("@langchain/core/messages");

require("dotenv").config();

const { VAR_OPENAI_API_KEY, VAR_OPENAI_API_BASE, VAR_OPENAI_API_MODEL } =
  process.env;

const SYSTEM_PROMPT = `

你是一个全能AI助手，可以回答任何领域的问题

规则：
- 根据问题自动切换专业模式，不需要用户指定
- 如果问题跨领域，分模块回答
- 不确定时诚实说明，不要编造
- 给代码示例时确保可运行,

回答格式要求：
1. 先给结论
2. 再给详细解释
3. 涉及代码给示例
4. 简洁明了，尽量一句话，避免使用专业术语或复杂的解释
`;

const sessions = new Map();

class ChatLLM {
  constructor() {
    this.llm = null;
    this.initllm();
  }

  initllm() {
    this.llm = new ChatOpenAI({
      configuration: {
        baseURL: VAR_OPENAI_API_BASE,
      },
      apiKey: VAR_OPENAI_API_KEY,
      model: VAR_OPENAI_API_MODEL,
      temperature: 0.7,
      timeout: 60000,
      streaming: true,
    });
  }

  // ========== 新增：流式 ==========
  /**
   * 返回一个 AsyncGenerator，yield 每个文本片段
   */
  async *getChatStream(sessionId, userMessage) {
    const history = this.getHistory(sessionId);
    history.push(new HumanMessage(userMessage));

    let fullContent = "";
    try {
      const stream = await this.llm.stream(history);

      for await (const chunk of stream) {
        if (chunk.content) {
          fullContent += chunk.content;
          yield chunk.content; // 每次 yield 一个文本片段
        }
      }

      // 流结束，把完整回复存入历史
      history.push(new AIMessage(fullContent));
      this._trimHistory(sessionId, history);
    } catch (error) {
      // 出错时移除用户消息，避免脏数据
      history.pop();
      console.error("[Stream Error]:", error.message);
      throw error;
    }
  }

  /**
   * 获取或创建会话历史
   */
  getHistory(sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [new SystemMessage(SYSTEM_PROMPT)]);
    }
    return sessions.get(sessionId);
  }

  /**
   * 多轮对话
   * @param {string} sessionId - 区分不同用户/会话
   * @param {string} userMessage - 用户当前输入
   */
  async getChat(sessionId, userMessage) {
    const history = this.getHistory(sessionId);

    // 把用户新消息追加进历史
    history.push(new HumanMessage(userMessage));

    try {
      const result = await this.llm.invoke(history);

      // 把 AI 回复也追加进历史，维持上下文
      history.push(new AIMessage(result.content));

      // 防止历史无限增长导致 token 爆掉（保留最近 20 条）
      if (history.length > 22) {
        // system prompt(1) + 最近 20 条消息
        const recent = history.slice(-20);
        sessions.set(sessionId, [new SystemMessage(SYSTEM_PROMPT), ...recent]);
      }

      return result.content;
    } catch (error) {
      // 如果调用失败，把刚加的用户消息移除，避免脏数据
      history.pop();
      console.error("[Chat Error]:", error.message);
      throw error;
    }
  }

  /**
   * 清除某个会话的历史
   */
  clearSession(sessionId) {
    sessions.delete(sessionId);
  }

  //   * 截断历史记录，保留最近 22 条

  _trimHistory(sessionId, history) {
    if (history.length > 24) {
      sessions.set(sessionId, [
        new SystemMessage(SYSTEM_PROMPT),
        ...history.slice(-22),
      ]);
    }
  }
}

module.exports = ChatLLM;
