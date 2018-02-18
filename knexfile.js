require('dotenv').config();

module.exports = {
  client: 'mysql',
  connection: {
    port: process.env.DB_PORT,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  pool: {
    min: +process.env.DB_POOL_MIN,
    max: +process.env.DB_POOL_MAX,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
}
