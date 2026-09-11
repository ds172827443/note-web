import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  App,
  Avatar,
  Button,
  Input,
  Popconfirm,
  Tag,
  Tooltip,
  theme,
} from "antd";
import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { createSessionId, sendChatStream } from "../api/chat";
import { userStorage } from "../utils/token";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  /** 流式输出进行中（还没收到 [DONE]） */
  streaming?: boolean;
}

interface Conversation {
  /** 同时也是后端的 sessionId */
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: number;
}

/** 欢迎页的预设问题，点击直接发送 */
const SUGGESTIONS = [
  { icon: "🧠", title: "解释一个概念", desc: "用大白话讲讲什么是事件循环" },
  { icon: "💻", title: "写段代码", desc: "用 TypeScript 实现一个防抖函数" },
  { icon: "✍️", title: "帮我润色", desc: "把这段话改得更专业一些" },
  { icon: "💡", title: "出出主意", desc: "给我一个周末学习计划" },
];

const STORAGE_KEY = "chat_conversations_v1";

function createConversation(): Conversation {
  return {
    id: createSessionId(),
    title: "新对话",
    messages: [],
    updatedAt: Date.now(),
  };
}

/** 从本地读取历史会话（刷新页面不丢聊天记录） */
function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as Conversation[];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((c) => ({ ...c, messages: c.messages ?? [] }));
      }
    }
  } catch {
    /* 读取失败就当没有历史 */
  }
  return [createConversation()];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "昨天";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 用首条提问当作会话标题 */
function buildTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 18 ? `${oneLine.slice(0, 18)}…` : oneLine;
}

export default function Chat() {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  /** 正在生成的会话及阶段：wait = 等首字，streaming = 流式输出中 */
  const [gen, setGen] = useState<{
    id: string;
    stage: "wait" | "streaming";
  } | null>(null);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const username = userStorage.get();
  const active =
    conversations.find((c) => c.id === activeId) ?? conversations[0];
  const msgList = active?.messages ?? [];
  const busy = !!gen && gen.id === active?.id;

  /** 保证 activeId 始终指向一个存在的会话 */
  useEffect(() => {
    if (!activeId || !conversations.some((c) => c.id === activeId)) {
      setActiveId(conversations[0]?.id ?? null);
    }
  }, [conversations, activeId]);

  /** 持久化到本地 */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  /** 消息更新时滚到底部 */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgList, gen, activeId]);

  /** 组件卸载时中断未完成的请求 */
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function updateConversation(
    id: string,
    updater: (c: Conversation) => Conversation,
  ) {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  /** 流式追加一个文本片段（按会话 id 写入，切换会话也不会写错） */
  function appendDelta(id: string, delta: string) {
    updateConversation(id, (c) => {
      const messages = [...c.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + delta,
          streaming: true,
        };
      }
      return { ...c, messages, updatedAt: Date.now() };
    });
  }

  /** 输出结束：收起光标；如果一条字都没收到就删掉这个空气泡 */
  function finishStreaming(id: string) {
    updateConversation(id, (c) => {
      const messages = [...c.messages];
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        if (!last.content) {
          messages.pop();
        } else {
          messages[messages.length - 1] = { ...last, streaming: false };
        }
      }
      return { ...c, messages };
    });
  }

  async function handleSend(preset?: string) {
    const content = (preset ?? input).trim();
    const conv = active;
    if (!content || !conv || busy || gen) return;

    setInput("");
    const isFirstMessage = conv.messages.length === 0;
    updateConversation(conv.id, (c) => ({
      ...c,
      title: isFirstMessage ? buildTitle(content) : c.title,
      updatedAt: Date.now(),
      messages: [...c.messages, { role: "user", content }],
    }));
    // 先放一条空的 AI 消息占位，后续逐个片段往里追加
    updateConversation(conv.id, (c) => ({
      ...c,
      messages: [
        ...c.messages,
        { role: "assistant", content: "", streaming: true },
      ],
    }));
    setGen({ id: conv.id, stage: "wait" });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let started = false;
      await sendChatStream({
        message: content,
        sessionId: conv.id,
        signal: controller.signal,
        onDelta: (delta) => {
          if (!started) {
            started = true;
            setGen({ id: conv.id, stage: "streaming" });
          }
          appendDelta(conv.id, delta);
        },
      });
      finishStreaming(conv.id);
      setGen(null);
    } catch (err) {
      setGen(null);
      finishStreaming(conv.id);
      // 用户主动中断（AbortController）不算错误
      if (err instanceof Error && err.name === "AbortError") {
        message.info("已停止生成");
        return;
      }
      console.error("对话失败", err);
      message.error(
        err instanceof Error && err.message
          ? `对话失败：${err.message}`
          : "对话失败，请检查后端服务是否已启动",
      );
    }
  }

  /** 停止生成：中断 SSE 连接，保留已输出的部分 */
  function handleStop() {
    if (!gen) return;
    abortRef.current?.abort();
    setGen(null);
    finishStreaming(gen.id);
  }

  /** 新建对话：旧会话自动留在左侧列表 */
  function handleNewChat() {
    if (gen) handleStop();
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setInput("");
  }

  function handleDelete(id: string) {
    if (gen?.id === id) handleStop();
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = createConversation();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function startRename(c: Conversation) {
    setRenamingId(c.id);
    setRenameValue(c.title);
  }

  function submitRename() {
    if (renamingId) {
      const name = renameValue.trim() || "新对话";
      updateConversation(renamingId, (c) => ({ ...c, title: name }));
    }
    setRenamingId(null);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  // ---------- 样式（全部取自 antd Design Token） ----------
  const bubbleUser: CSSProperties = {
    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    color: "#fff",
    borderRadius: "16px 16px 4px 16px",
    padding: "10px 14px",
    maxWidth: "76%",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.7,
    boxShadow: token.boxShadowTertiary,
  };

  const bubbleBot: CSSProperties = {
    background: token.colorBgContainer,
    color: token.colorText,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: "16px 16px 16px 4px",
    padding: "10px 14px",
    maxWidth: "76%",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.7,
    boxShadow: token.boxShadowTertiary,
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: token.colorBgLayout,
        overflow: "hidden",
      }}
    >
      {/* ===== 左侧会话列表 ===== */}
      <aside
        style={{
          width: collapsed ? 0 : 260,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width .22s ease",
          background: token.colorBgContainer,
          borderRight: collapsed
            ? "none"
            : `1px solid ${token.colorBorderSecondary}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 12 }}>
          <Button
            type="primary"
            block
            icon={<PlusOutlined />}
            onClick={handleNewChat}
            style={{ height: 40, fontWeight: 500 }}
          >
            新建对话
          </Button>
        </div>
        <div
          style={{
            padding: "0 12px 6px",
            fontSize: 12,
            color: token.colorTextQuaternary,
          }}
        >
          历史会话 · {conversations.length}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
          {conversations.map((c) => {
            const selected = c.id === active?.id;
            const renaming = renamingId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => !renaming && setActiveId(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 10px",
                  marginBottom: 4,
                  borderRadius: token.borderRadius,
                  cursor: renaming ? "default" : "pointer",
                  background: selected ? token.colorPrimaryBg : "transparent",
                  color: selected ? token.colorPrimary : token.colorText,
                  border: `1px solid ${selected ? token.colorPrimaryBorder : "transparent"}`,
                  transition: "background .18s",
                }}
                onMouseEnter={(e) => {
                  if (!selected && !renaming)
                    e.currentTarget.style.background = token.colorFillTertiary;
                }}
                onMouseLeave={(e) => {
                  if (!selected)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <CommentOutlined style={{ flexShrink: 0, fontSize: 13 }} />
                {renaming ? (
                  <Input
                    autoFocus
                    size="small"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onPressEnter={submitRename}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={c.title}
                    >
                      {c.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: token.colorTextQuaternary,
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(c.updatedAt)}
                    </span>
                    <Tooltip title="重命名">
                      <EditOutlined
                        style={{ fontSize: 12, flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(c);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="删除这个对话？"
                      description="删除后不可恢复"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDelete(c.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <DeleteOutlined
                        style={{ fontSize: 12, flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: "10px 12px 14px",
            fontSize: 11,
            color: token.colorTextQuaternary,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          记录保存在浏览器本地，切换会话保留上下文
        </div>
      </aside>

      {/* ===== 主对话区 ===== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* 顶栏 */}
        <header
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
              title="收起/展开会话列表"
            />
            <Avatar
              size={40}
              icon={<RobotOutlined />}
              style={{
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
                boxShadow: token.boxShadowSecondary,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: token.colorText,
                }}
              >
                {active?.title || "AI 智能助手"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 1,
                }}
              >
                <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
                  有问必答 · 支持多轮上下文
                </span>
                <Tag
                  color="processing"
                  bordered={false}
                  style={{ marginInlineEnd: 0 }}
                >
                  在线
                </Tag>
              </div>
            </div>
          </div>
          <Button
            type="primary"
            ghost
            icon={<PlusOutlined />}
            onClick={handleNewChat}
          >
            新对话
          </Button>
        </header>

        {/* 消息区 */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 16px",
            scrollBehavior: "smooth",
            background: `linear-gradient(180deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 32%)`,
          }}
        >
          <div
            style={{
              maxWidth: 860,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {msgList.length === 0 ? (
              /* 欢迎屏 */
              <div style={{ paddingTop: "6vh", textAlign: "center" }}>
                <Avatar
                  size={72}
                  icon={<RobotOutlined />}
                  style={{
                    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
                    boxShadow: token.boxShadowSecondary,
                  }}
                />
                <h2
                  style={{
                    marginTop: 20,
                    marginBottom: 6,
                    color: token.colorText,
                  }}
                >
                  你好{username ? `，${username}` : ""}，我是你的 AI 助手
                </h2>
                <p style={{ color: token.colorTextTertiary, marginBottom: 32 }}>
                  有什么想聊的？试试下面的问题，或者直接输入
                </p>
              </div>
            ) : (
              msgList.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 10,
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  }}
                >
                  {msg.role === "user" ? (
                    <Avatar
                      size={36}
                      style={{
                        backgroundColor: token.colorPrimary,
                        flexShrink: 0,
                        fontWeight: 600,
                      }}
                    >
                      {username ? username.charAt(0).toUpperCase() : "我"}
                    </Avatar>
                  ) : (
                    <Avatar
                      size={36}
                      icon={<RobotOutlined />}
                      style={{
                        background: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={msg.role === "user" ? bubbleUser : bubbleBot}>
                    {msg.content}
                    {msg.streaming && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: 14,
                          marginLeft: 2,
                          verticalAlign: "-2px",
                          background: token.colorPrimary,
                          animation: "chat-blink 0.8s steps(1) infinite",
                        }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* 等待响应：三个跳动的点 */}
            {busy && gen?.stage === "wait" && (
              <div style={{ display: "flex", gap: 10 }}>
                <Avatar
                  size={36}
                  icon={<RobotOutlined />}
                  style={{
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                  }}
                />
                <div
                  style={{
                    ...bubbleBot,
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: token.colorPrimary,
                        animation: "chat-bounce 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 预设问题卡片（仅在空会话时显示） */}
          {msgList.length === 0 && (
            <div
              style={{
                maxWidth: 860,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
                textAlign: "left",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <div
                  key={s.title}
                  onClick={() => handleSend(s.desc)}
                  style={{
                    padding: "14px 16px",
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                    cursor: "pointer",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = token.colorPrimary;
                    e.currentTarget.style.boxShadow = token.boxShadowTertiary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      token.colorBorderSecondary;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: token.colorText,
                      marginBottom: 4,
                    }}
                  >
                    {s.icon} {s.title}
                  </div>
                  <div
                    style={{ fontSize: 12.5, color: token.colorTextTertiary }}
                  >
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 输入区 */}
        <footer style={{ flexShrink: 0, padding: "12px 16px 20px" }}>
          <div
            style={{
              maxWidth: 860,
              margin: "0 auto",
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              padding: "10px 12px",
              boxShadow: token.boxShadowSecondary,
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="给 AI 发送消息…"
              autoSize={{ minRows: 1, maxRows: 6 }}
              variant="borderless"
              style={{ fontSize: 15, padding: "4px 4px" }}
              maxLength={2000}
            />
            {busy ? (
              <Tooltip title="停止生成">
                <Button
                  shape="circle"
                  size="large"
                  icon={<StopOutlined />}
                  onClick={handleStop}
                  style={{ flexShrink: 0 }}
                />
              </Tooltip>
            ) : (
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<SendOutlined />}
                disabled={!input.trim()}
                onClick={() => handleSend()}
                style={{ flexShrink: 0 }}
              />
            )}
          </div>
          <div
            style={{
              maxWidth: 860,
              margin: "8px auto 0",
              textAlign: "center",
              fontSize: 12,
              color: token.colorTextQuaternary,
            }}
          >
            Enter 发送 · Shift + Enter 换行 · 内容由 AI 生成，请注意甄别
          </div>
        </footer>
      </div>
    </div>
  );
}
