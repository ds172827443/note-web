// 登录请求参数
export interface LoginParams {
  username: string;
  password: string;
}

// 登录成功返回的数据
export interface LoginResult {
  code: number;
  token: string;
  userId: string;
  userName: string;
  status: boolean;
}

// 留言
export interface MessageItem {
  messageId: number;
  content: string;
  userId: string;
  createdAt: string;
  userName: string;
}

// 后端统一响应格式（和你 Koa 全局错误处理中间件对应）
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 后端错误响应
export interface ApiError {
  code: number;
  message: string;
}
