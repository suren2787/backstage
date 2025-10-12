exports.up = function(knex) {
  return knex.schema.createTable('kafka_topology', function(table) {
    table.increments('id').primary();
    table.string('context').notNullable();
    table.jsonb('topics').notNullable();
    table.string('source').notNullable();
    table.string('path').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('kafka_topology');
};
