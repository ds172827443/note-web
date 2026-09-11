const jwt = require("jsonwebtoken");

const SECRET = process.env.VAR_JWTSECRET; // 生产环境放环境变量里
const EXPIRES_IN = process.env.VAR_JWTEXPIRESIN; // 过期时间

// 生成 Token
const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

// 验证 Token
const verifyToken = async (ctx, next) => {
  if (!ctx.request.headers.authorization) {
    ctx.status = 500;
    ctx.body = {
      code: "9999",
      message: "没有提供token",
      data: null,
    };
    return;
  }
  const { authorization } = ctx.request.headers;
  const token = String(authorization.replace("Bearer ", ""));
  // 验证token的合法性
  try {
    const user = jwt.verify(token, SECRET);
    ctx.state.user = user;
  } catch (error) {
    ctx.status = 403;
    ctx.body = {
      code: "9999",
      message: "token错误或过期失效",
      data: null,
    };
    return;
  }
  await next();
};

module.exports = { generateToken, verifyToken };
