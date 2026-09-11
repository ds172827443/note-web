const Router = require("@koa/router");
const router = new Router({ prefix: "/user" });
const db = require("../models");
const Users = db.User;

const { generateToken } = require("../until/jwt");
const { authParams } = require("../until/authParams");
const { success, throwError } = require("../until/handle");
const { verifyToken } = require("../until/jwt");

// 用户注册
router.post("/createUser", async (ctx) => {
  const { userName, password, phone, sex } = ctx.request.body;
  // 校验参数
  authParams({ userName, password });
  // 校验用户名是否存在
  const userExist = await Users.findOne({
    where: {
      userName,
    },
  });

  if (userExist) {
    if (userExist.password !== password) {
      throwError(400, "账号或者密码错误，请重新输入");
    } else {
      const token = generateToken({ userId: userExist.userId });
      success(ctx, { token, ...userExist.dataValues }, "用户登录成功");
    }
  } else {
    const user = await Users.create({
      userName,
      password,
      phone,
      sex,
    });

    // 字段注入token中
    const token = generateToken({
      userId: user.userId,
      userName: user.userName,
    });
    success(ctx, { token, ...user.dataValues }, "用户创建成功");
  }
});

// 查询用户
router.get("/:userId", verifyToken, async (ctx) => {
  const users = await Users.findOne({
    where: {
      userId: ctx.params.userId,
    },
  });
  success(ctx, users, "查询用户成功");
});

module.exports = router;
