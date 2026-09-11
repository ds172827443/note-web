import { useEffect, useState } from "react";
import { App, Avatar, Button, Input, Modal } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { addMessage, getMessagesList } from "../api";
import type { MessageItem } from "../api/types";
import { tokenStorage, userStorage } from "../utils/token";

export default function Home() {
  const { message, modal } = App.useApp();
  const [msgList, setMsgList] = useState<MessageItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = tokenStorage.has();
  const username = userStorage.get();

  async function getNoteList() {
    const res = await getMessagesList();
    setMsgList(res.data || []);
  }

  useEffect(() => {
    getNoteList();
  }, []);

  // 新增留言：未登录先跳登录页
  function handleAddClick() {
    if (!tokenStorage.has()) {
      window.location.href = "/login";
      return;
    }
    const time = new Date().toLocaleString();
    setContent(`${time} ${content}`);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setContent("");
  }

  // 点击头像：已登录→退出；未登录→去登录
  function handleAvatarClick() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    modal.confirm({
      title: "退出登录",
      content: "确定退出登录吗？",
      okText: "确定",
      cancelText: "取消",
      onOk() {
        tokenStorage.remove();
        userStorage.remove();
        window.location.href = "/login";
      },
    });
  }

  async function handleConfirm() {
    const text = content.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await addMessage(text);
      closeModal();
      await getNoteList(); // 刷新列表
      message.success("新增留言成功");
    } catch (err) {
      console.error("新增留言失败", err);
      message.error(
        err instanceof Error ? err.message : "新增留言失败，请重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const TAILWIND_BG_CLASSES = [
    "bg-red-100",
    "bg-yellow-100",
    "bg-green-100",
    "bg-blue-100",
    "bg-purple-100",
    "bg-pink-100",
    "bg-indigo-100",
    "bg-teal-100",
    "bg-orange-100",
  ];
  function randomTailwindBg(index: number): string {
    return TAILWIND_BG_CLASSES[index % TAILWIND_BG_CLASSES.length];
  }

  return (
    <div>
      <div className="flex items-center justify-between my-5">
        <p className="font-bold text-3xl">欢迎来到霜降笔记</p>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleAvatarClick}
            title={isLoggedIn ? "点击退出登录" : "点击登录"}
          >
            <Avatar
              size="large"
              style={{ backgroundColor: isLoggedIn ? "#1677ff" : "#bfbfbf" }}
            >
              {isLoggedIn && username ? username.charAt(0).toUpperCase() : "?"}
            </Avatar>
            {isLoggedIn && <span>{username}</span>}
          </div>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={() => (window.location.href = "/chat")}
          >
            AI 对话
          </Button>
          <Button type="primary" onClick={handleAddClick}>
            新增留言
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4 ">
        {msgList.map((item, index) => (
          <div
            key={item.messageId}
            className={`h-50 p-2 rounded-5 flex flex-col ${randomTailwindBg(index)}`}
          >
            <p className="flex-1 break-words">{item.content}</p>
            <p className="text-right text-xs text-gray-600 mt-1">
              作者：{item?.userName ?? "匿名"}
            </p>
          </div>
        ))}
      </div>

      <Modal
        title="新增留言"
        open={showModal}
        onOk={handleConfirm}
        onCancel={closeModal}
        confirmLoading={submitting}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ disabled: !content.trim() }}
        destroyOnClose
      >
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请输入留言内容"
          rows={4}
          maxLength={500}
        />
      </Modal>
    </div>
  );
}
