"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userData = [];
    const counts = 10;

    for (let i = 1; i <= counts; i++) {
      const user = {
        userName: `用户 ${i}`,
        password: `123456`,
        phone: `1380000000${i}`,
        sex: i % 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userData.push(user);
    }
    await queryInterface.bulkInsert("Users", userData, {});
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
