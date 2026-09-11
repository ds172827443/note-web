const Sequelize = require("sequelize");

module.exports = async (ctx, next) => {
  try {
    await next();

    // 处理404（路由未匹配）
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = {
        code: 10005,
        message: "接口不存在",
      };
    }
  } catch (err) {
    // 1. 处理我们自定义的错误（核心！）
    if (err.isCustomError) {
      ctx.status = err.status;
      ctx.body = {
        code: err.code,
        message: err.message,
        details: err.details,
        // 开发环境返回错误栈，生产环境不返回
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      };
    }
    // 2. 处理Sequelize唯一键冲突（比如账号已存在，不用手动调用throwError）
    else if (err instanceof Sequelize.UniqueConstraintError) {
      const field = err.errors[0]?.path;
      const value = err.errors[0]?.value;
      ctx.status = 409;
      ctx.body = {
        code: 10002,
        message: `${field} 已存在：${value}`,
        details: { field, value },
      };
    }
    // 3. 处理Sequelize参数校验错误
    else if (err instanceof Sequelize.ValidationError) {
      const details = err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      }));
      ctx.status = 400;
      ctx.body = {
        code: 10001,
        message: "参数校验失败",
        details,
      };
    }
    // 4. 其他未知错误（服务器内部错误）
    else {
      console.error("未知错误:", err.stack);
      ctx.status = 500;
      ctx.body = {
        code: 10006,
        message: "服务器内部错误",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      };
    }

    // 抛给应用做日志收集
    ctx.app.emit("error", err, ctx);
  }
};
