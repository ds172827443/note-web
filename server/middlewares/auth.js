const { verifyToken } = require("../utils/jwt");
const { throwAuthError } = require("../utils/error");

const isInWhiteList = (method, path) => {
  return WHITE_LIST.some(
    (item) => item.method === method && item.path === path,
  );
};

module.exports = async (ctx, next) => {
  // 从 Header 里取 Token
  const authHeader = ctx.headers.authorization;

  if (!authHeader) {
    throwAuthError("请先登录");
    return;
  }

  // 格式通常是：Bearer <token>
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  // 验证 Token
  const decoded = verifyToken(token);
  console.log("---------decoded =", decoded);
  if (!decoded) {
    throwAuthError("Token 无效或已过期");
    return;
  }

  // ✅ 把解析出来的用户信息挂到 ctx.state.user 上
  // 后续所有中间件和路由都能通过 ctx.state.user 拿到当前登录用户
  ctx.state.user = decoded;

  await next();
};
