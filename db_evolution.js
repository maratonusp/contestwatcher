const logger = require('./logger');
const db = require('./db');
const version = 1; // Increase the version for evolving

db.low.defaults({ version: 0 }).write();

const evolve = () => {
    let db_version = db.low.get('version').value();
    logger.info("Database version: " + db_version);
    if(db_version < version) {
        logger.info("DATABASE WILL EVOLVE");

        // /migration code starts here
        db.low.get('users').value().forEach((record) => {
            let id = record.id;
            let user = db.user.get(id);
            console.log(user);
            if(!user.has('cf_handles').value())
                user.set('cf_handles', []).write();
        });
        //migration code ends here

        db.low.set('version', version).write();
        logger.info("New database version is: " + version);
    }
};

module.exports = {
    evolve: evolve
};
