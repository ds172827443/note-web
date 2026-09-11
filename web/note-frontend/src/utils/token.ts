const TOKEN_KEY = "token";
const USERNAME_KEY = "username";

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  remove(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  // 检查是否登录
  has(): boolean {
    return !!this.get();
  },
};

// 登录用户名（登录成功后持久化，用于顶部展示）
export const userStorage = {
  get(): string | null {
    return localStorage.getItem(USERNAME_KEY);
  },

  set(username: string): void {
    localStorage.setItem(USERNAME_KEY, username);
  },

  remove(): void {
    localStorage.removeItem(USERNAME_KEY);
  },
};
