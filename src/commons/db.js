const promise = require('bluebird');
const pgPromise = require('pg-promise');
const DB_URL = 'postgres://postgres:postgres@localhost:5432/classroom'

const create = (databaseUrl) => {
  const initOptions = {
    promiseLib: promise,
    error(error, e) {
      console.error(e.query);
      return { ...error, DB_ERROR: true, query: e.query };
    }
  };

  const pgp = pgPromise(initOptions);
  const db = pgp(databaseUrl);
  console.log("Database Connected ", db.connect);

  return db;
};

module.exports = create(DB_URL);

