const Router = require("@koa/router");
const router = new Router();


router.post("/login", async (ctx) => {
  ctx.body = {
    code: 200,
    msg: "hello login",
  };
});



module.exports = router;
