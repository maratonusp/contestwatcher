const logger = require('./logger');
const lowdb = require('lowdb');
const low = lowdb('db.json', {
	storage: require('lowdb/lib/storages/file-async')
});

module.exports = {low: low};

module.exports.user = (function () {
	var User = {};

	low.defaults({users: []}).write();

	User.create = function (chat) {
		logger.info('Creating user ' + chat.id);
		low.get('users')
			.push({
				id: chat.id,
				notify: false,
				ignore: {calendar: true},
				last_activity: Date.now(),
				cf_handles: [],
				is_group: chat.type == "group"
			})
			.write();

		return low
			.get('users')
			.find({id : chat.id});
	};

	User.get = function (chat) {
		var user = low
			.get('users')
			.find({id : chat.id});
		if (user.isUndefined().value())
			return module.exports.user.create(chat);
		return user;
	};

	User.get_by_id = function (id) {
		var user = low
			.get('users')
			.find({id : id});
		return user;
	};
	
	User.migrate = function (old_id, new_id) {
		logger.info('Migrating user ' + old_id + ' to ' + new_id);
		var user = User
			.get(old_id)
			.assign({id : new_id})
			.write();
	};

	return User;
})();

// vim:noet
