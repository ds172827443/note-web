const Router = require("@koa/router");
const router = new Router();
const db = require("../models"); // 引入数据库模型
const { authParams } = require("../until/authParams");
const { success } = require("../until/handle");
const { verifyToken } = require("../until/jwt");
const Message = db.Message; // 引入消息模型

// 获取留言列表
router.get("/msgList", async (ctx) => {
  const messages = await Message.findAll({
    order: [["createdAt", "DESC"]],
  });
  success(ctx, messages, "获取留言列表成功");
});

// 留言
router.post("/createMsg", verifyToken, async (ctx) => {
  const { content } = ctx.request.body;
  authParams({ content });

  const message = await Message.create({
    userId: ctx.state.user.userId,
    userName: ctx.state.user.userName,
    content,
  });
  console.log("---message", ctx.state.user);
  success(ctx, message, "留言成功");
});

module.exports = router;
