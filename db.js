const low = require('lowdb');
const db = low('db.json', {
  storage: require('lowdb/lib/storages/file-async')
})

module.exports = db;
module.exports = {low: db};
