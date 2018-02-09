const logger = require('./logger');
const lowdb = require('lowdb');
const low = lowdb('db.json', {
	storage: require('lowdb/lib/storages/file-async')
});

module.exports = {low: low};

module.exports.user = (function () {
	var User = {};

	low.defaults({users: []}).write();

	User.create = function (id) {
		logger.info('Creating user ' + id);
		low.get('users')
			.push({
				id: id,
				notify: false,
				ignore: {calendar: true},
				last_activity: Date.now(),
				cf_handles: [],
			})
			.write();

		return low
			.get('users')
			.find({id : id});
	}

	User.get = function (id) {
		var user = low
			.get('users')
			.find({id : id});
		if (user.isUndefined().value())
			return module.exports.user.create(id);
		return user;
	}
	
	User.migrate = function (old_id, new_id) {
		logger.info('Migrating user ' + old_id + ' to ' + new_id);
		var user = User
			.get(old_id)
			.assign({id : new_id})
			.write();
	}

	return User;
})();
