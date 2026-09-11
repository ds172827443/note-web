import axios from "axios";
import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  CancelTokenSource,
} from "axios";
import { tokenStorage } from "../utils/token";

// ========== 1. 创建实例 ==========
const request = axios.create({
  baseURL: "/api", // ✅ 配合 Vite 代理，不用写完整域名
  timeout: 10000, // 10 秒超时
  headers: {
    "Content-Type": "application/json",
  },
});

// ========== 2. 防止重复请求（Map 存 CancelToken） ==========
const pendingRequests = new Map<string, CancelTokenSource>();

const generateRequestKey = (config: InternalAxiosRequestConfig): string => {
  const { method, url, params, data } = config;
  return [method, url, JSON.stringify(params), JSON.stringify(data)].join("&");
};

// ========== 3. 请求拦截器 ==========
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 3.1 自动带 Token
    const token = tokenStorage.get();
    if (token) {
      config.headers!.Authorization = `Bearer ${token}`;
    }

    // 3.2 取消重复请求（防止按钮连点）
    const requestKey = generateRequestKey(config);
    if (pendingRequests.has(requestKey)) {
      // 如果同一个请求还在进行中，直接取消旧的
      pendingRequests.get(requestKey)!.cancel("请求被取消（重复请求）");
      pendingRequests.delete(requestKey);
    }

    // 创建新的 CancelToken
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    pendingRequests.set(requestKey, source);

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// ========== 4. 响应拦截器 ==========
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 4.1 请求完成，从 pending 中移除
    const requestKey = generateRequestKey(response.config);
    pendingRequests.delete(requestKey);

    const { code, message } = response.data;
    console.log(response.data);
    // 4.2 业务成功（后端返回 code === 0）
    if (code === 200) {
      return response.data; // ✅ 直接返回 data，调用方不用再写 res.data.data
    }

    // 4.3 业务失败（比如 code === 10001 参数错误）
    return Promise.reject({
      code,
      message,
      details: response.data.details,
    });
  },
  (error: AxiosError<{ code: number; message: string }>) => {
    // 请求被取消，不打错误日志
    if (axios.isCancel(error)) {
      console.log("请求取消:", error.message);
      return Promise.reject({ code: -1, message: "请求被取消" });
    }

    // 从 pending 中移除
    if (error.config) {
      const requestKey = generateRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    // 4.4 HTTP 状态码错误处理
    const status = error.response?.status;
    const backendMsg = error.response?.data?.message;

    switch (status) {
      case 400:
        console.error("参数错误:", backendMsg);
        break;
      case 401:
        // ✅ Token 无效/过期 → 清除登录态，跳转到登录页
        console.error("未登录或 Token 过期");
        tokenStorage.remove();
        // 如果你用了 React Router，这里可以 window.location.href = '/login'
        window.location.href = "/login";
        break;
      case 403:
        console.error("无权限访问");
        break;
      case 404:
        console.error("接口不存在");
        break;
      case 500:
        console.error("服务器内部错误");
        break;
      default:
        console.error("网络错误，请检查连接");
    }

    return Promise.reject({
      code: status || -1,
      message: backendMsg || error.message || "请求失败",
    });
  },
);

export default request;
