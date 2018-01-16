/* Commands regarding dealing with codeforces handles */
const logger = require('../logger');
const EventEmitter = require('events');
const cfAPI = require('../judgeAPIs/cfAPI');
const Bot = require('../bot');
const db = require('../db');
const html_msg = require('../html-msg');

const cf = module.exports = {};

const add_handle_reply_msg = "Please send me your handle. :D";

/* Adds CF handle to handle list */
function add_handles(message) {
	if(message.text.indexOf(' ') === -1) {
		Bot.sendMessage(message.chat.id, add_handle_reply_msg, {
			reply_to_message_id: message.message_id,
			reply_markup: {
				force_reply: true,
				selective: true
			}
		});
		return;
	}
	const emitter = new EventEmitter();
	const user = db.user.get(message.chat.id);

	emitter.on('add', (handles, wrong_handles) => {
		Array.from(handles).forEach((h) => user.get('cf_handles').push(h).write());
		if (wrong_handles.length == 0) emitter.emit('end', "Handles added successfully :)");
		else {
			wrong_handles.sort()
			wrong_handles = wrong_handles.map((h) => '<code>' + html_msg.escape(h) + '</code>')
			emitter.emit('end', "These handles could not be added: " + wrong_handles.join(', ') + '.')
		}
	});
	emitter.on('end', (txt, handles) => {
		Bot.sendMessage(message.chat.id, txt, {
			parse_mode: 'html',
			disable_web_page_preview: true
		});
	});

	// Use lowercase handles for comparison
	const user_cur = new Set(user.get('cf_handles').value().map(x => x.toLowerCase()));
	const allHandles =
		Array.from(new Set(
			message.text.slice(message.text.indexOf(' ') + 1)
			.toLowerCase()
			.trim().split(' ')))
		.map((h) => h.trim()).
		filter((h) => h.length > 0 && !user_cur.has(h));

	if(allHandles.length === 0)
		emitter.emit('end', "No new handles to add.");
	else {
		if (allHandles.length > 100) {
			logger.warn('User ' + message.chat.id + ' tried to add more than 100 handles.');
			emitter.emit('end', "I'm not about to do that.");
		} else {
			const handles_set = new Set();

			cfAPI.call_cf_api('user.info', {handles: allHandles.join(';')}, 1).on('error', () => {
				var wrong_handles = []
				var handlesToAdd = allHandles.length
				emitter.on('check', (handle) => {
					cfAPI.call_cf_api('user.info', {handles: handle}, 2).on('error', () => {
						wrong_handles.push(handle);
						if (--handlesToAdd == 0) emitter.emit('add', handles_set, wrong_handles);
					}).on('end', (data) => {
						// Adds handle with correct case
						handles_set.add(data[0]['handle'])
						if (--handlesToAdd == 0) emitter.emit('add', handles_set, wrong_handles);
					});
				});
				for (var i in allHandles) {
					emitter.emit('check', allHandles[i]);
				}
			}).on('end', (data) => {
				// Adds all handles with correct case
				data.forEach(u => handles_set.add(u['handle']));
				emitter.emit('add', handles_set, [])
			})
		}
	}
}

/* Lists added CF handles */
function list_handles(message) {
	const user = db.user.get(message.chat.id);
	let msg;
	if(!user.has('cf_handles').value() || user.get('cf_handles').size().value() == 0)
		msg = "No Codeforces handles.";
	else
		msg = "Codeforces handles: " + user.get('cf_handles').value().join(', ');
	Bot.sendMessage(message.chat.id, msg, {})
}

/* Removes CF handle from handle list */
function rem_handles(message) {
	let msg;
	if(message.text.indexOf(' ') === -1)
		msg = "No handles to remove.";
	else {
		const user = db.user.get(message.chat.id);
		const hs = new Set(message.text.slice(message.text.indexOf(' ') + 1).toLowerCase().split(' '))
		if(!user.has('cf_handles').value())
			user.set('cf_handles', []).write();
		user.get('cf_handles').remove((h) => hs.has(h.toLowerCase())).write();
		msg = "Handles removed successfully :)";
	}
	Bot.sendMessage(message.chat.id, msg, {});
}

/* Shows help message for handles */
function help_handles(message) {
	let msg = "You can have a list of codeforces handles to watch. If you have " +
		"codeforces notifications enabled, you will be notified about all contests, " +
		"but you will only receive information regarding the system testing and " +
		"rating changes for contests that some user with handle on " +
		"your handle list is participating.\n\n" +
		"The following commands are for handling your handles:\n" +
		"/add_handles h1 h2 h3 - add codeforces handles to your handle list\n" +
		"/rem_handles h1 h2 h3 - remove codeforces handles to your handle list\n" +
		"/list_handles - list codeforces handles in your handle list\n";
	Bot.sendMessage(message.chat.id, msg, {});
}

cf.init = function() {
	const bot = Bot.bot;

	bot.on('message', (msg) => {
		// check for reply on handle add
		if(msg.reply_to_message) {
			let rp = msg.reply_to_message;
			if(rp.text === add_handle_reply_msg) {
				let cp = JSON.parse(JSON.stringify(msg)); // deep copy
				cp.text = "/add_handles " + cp.text;
				add_handles(cp);
			}
		}
	});

	/* CF handles stuff */
	bot.onText(/^\/list_handles(@\w+)*$/, list_handles);
	bot.onText(/^\/help_handles(@\w+)*$/, help_handles);
	bot.onText(/^\/add_handles(@\w+)* ?.*$/, add_handles);
	bot.onText(/^\/rem_handles(@\w+)* ?.*$/, rem_handles);
}

