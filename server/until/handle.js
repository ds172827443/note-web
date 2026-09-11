const db = require("../models");

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

function success(ctx, data = {}, message = "操作成功", code = 200) {
  ctx.status = code;
  ctx.body = {
    status: true,
    message,
    code,
    data,
  };
}

function fail(error, ctx) {
  if (error.name === "NotFoundError") {
    ctx.status = 404;
    ctx.body = {
      status: false,
      message: error.message,
      code: 404,
    };
  } else if (error.name === "SequelizeValidationError") {
    const errors = error.errors.map((item) => item.message);
    ctx.status = 400;
    ctx.body = {
      status: false,
      message: errors,
      code: 400,
    };
  } else if (error.name === "TokenExpiredError") {
    ctx.status = 401;
    ctx.body = {
      status: false,
      message: "token过期",
      code: 401,
    };
  } else if (error.name === "JsonWebTokenError") {
    ctx.status = 401;
    ctx.body = {
      status: false,
      message: "token无效",
      code: 401,
    };
  } else {
    ctx.status = 500;
    ctx.body = {
      status: false,
      message: error.message,
      code: 500,
    };
  }
}

function throwError(status, message) {
  const err = new Error(message);
  // 给原生Error加自定义属性，中间件靠这些属性识别
  err.status = status;
  err.code = status;
  err.isCustomError = true; // 标记为自定义错误，避免和其他Error冲突
  throw err;
}

module.exports = {
  NotFoundError,
  throwError,
  success,
  fail,
};
