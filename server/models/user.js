"use strict";
const { Model } = require("sequelize");
const { encode } = require("../until/hashid");
const Message = require("./message");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 一个用户有多条留言
      models.User.hasMany(models.Message, {
        foreignKey: "userId",
        sourceKey: "userId", //用 Hashids 短ID 做关联（不是主键 id）
        as: "messages",
      });
      // 一个留言属于一个用户
      models.Message.belongsTo(models.User, {
        foreignKey: "userId",
        sourceKey: "userId",
        as: "user",
      });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true, // 主键
        autoIncrement: true, // 自动递增
        allowNull: false, // 不能为空
      },
      userId: {
        type: DataTypes.STRING(16),
        unique: true,
        allowNull: true,
        comment: "Hashids 短ID，对外暴露",
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: false, // 不能为空
        unique: true, // 唯一性
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false, // 不能为空
      },
      phone: DataTypes.STRING,
      sex: DataTypes.INTEGER,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
      hooks: {
        afterCreate: async (user, options) => {
          // 用自增 id 编码生成 userId
          user.userId = encode(user.id);
          // 保存回数据库（只更新 userId 字段）
          await user.save({ fields: ["userId"] });
        },
      },
    },
  );

  return User;
};
