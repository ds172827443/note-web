const { throwError } = require("./handle");

const authParams = (ctxParams) => {
  for (const key in ctxParams) {
    if (!Object.hasOwn(ctxParams, key)) continue;

    const element = ctxParams[key];
    console.log("---element", element);
    if (!element) {
      throwError(400, "参数错误");
      return;
    }
  }
};

module.exports = {
  authParams,
};
