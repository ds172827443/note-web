"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Messages", {
      messageId: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        allowNull: false, // 不允许为空
        autoIncrement: true,
      },
      content: {
        type: Sequelize.TEXT,
      },
      userId: {
        type: Sequelize.STRING(16),
        allowNull: false, // 不允许为空
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Messages");
  },
};
