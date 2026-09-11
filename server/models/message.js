"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Message.init(
    {
      userId: {
        type: DataTypes.STRING(16),
        allowNull: false,
        comment: "发布者 userId",
      },
      userName: DataTypes.STRING(16),
      content: DataTypes.TEXT,
      messageId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "Message",
      updatedAt: false,
    },
  );
  // const fields = Object.keys(Message.rawAttributes);
  // console.log("📋 ----Message 注册的所有字段:", fields);

  return Message;
};
