"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "userId", {
      type: Sequelize.STRING(16),
      unique: true,
      allowNull: true, // 先允许 NULL，方便回填
      comment: "Hashids 短ID",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "userId");
  },
};
