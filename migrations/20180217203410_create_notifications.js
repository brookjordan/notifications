
exports.up = function(knex, Promise) {
  return knex.schema.createTable('notification', table => {
    table.increments();
    table.timestamps(false, true);

    table.string('status', Math.pow(2, 5) - 1)
         .defaultTo('unread');
    table.string('type', Math.pow(2, 5) - 1)
         .notNullable();
    table.string('recipients', Math.pow(2, 10) - 1);
    table.json('data', Math.pow(2, 15) - 1)
         .notNullable();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('notification');
};
