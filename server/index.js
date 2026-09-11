const Koa = require("koa");
const cors = require("@koa/cors");
const bodyparser = require("koa-bodyparser"); // 解析请求体

require("dotenv").config();

const app = new Koa();

const corsOptions = {
  // origin: "*",
  origin: ["http://localhost:5173"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

const errorHandler = require("./middlewares/errorHandler");
const loginRouter = require("./routes/login.router");
const usersRouter = require("./routes/users.router");
const messageRouter = require("./routes/message.router");
const chatRouter = require("./routes/chat.router");
const { fail } = require("./until/handle");

app.use(cors(corsOptions));
app.use(errorHandler);
app.use(bodyparser());

app.use(chatRouter.routes()).use(chatRouter.allowedMethods());
app.use(loginRouter.routes()).use(loginRouter.allowedMethods());
app.use(messageRouter.routes()).use(messageRouter.allowedMethods());
app.use(usersRouter.routes()).use(usersRouter.allowedMethods());

app.on("error", (err, ctx) => {
  console.error("-----Server Error", err, ctx);
  fail(err, ctx);
});

app.listen(process.env.VAR_PORT, () => {
  console.log(`---http://127.0.0.1:${process.env.VAR_PORT}`);
});

// const crypto = require("crypto");
// console.log("crypto", crypto.randomBytes(32).toString("hex"));

// 执行 sync 建表
// seq.sync()
//   .then(() => {
//     console.log('✅ 数据表同步完成');
//   })
//   .catch(err => {
//     console.error('❌ 同步失败:', err.message);
//   });
