"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const msgData = [];
    const counts = 10;

    for (let i = 1; i <= counts; i++) {
      const msg = {
        content: `留言 ${i}`,
        userId: "4V28m9pr",
        createdAt: new Date(),
      };

      msgData.push(msg);
    }
    await queryInterface.bulkInsert("Messages", msgData, {});
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
