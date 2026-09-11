import request from "./request";
import type {
  LoginParams,
  LoginResult,
  MessageItem,
} from "./types";

// 登录
export const login = (data: LoginParams) =>
  request.post<LoginResult>("/user/createUser", data);

// 发留言
export const addMessage = (content: string) =>
  request.post<MessageItem>("/createMsg", { content });

// 获取所有留言（带作者信息）
export const getMessagesList = () => request.get<MessageItem[]>("/msgList");

// 获取我的留言
export const getMyMessages = () => request.get<MessageItem[]>("/messages/mine");
