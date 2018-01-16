const logger = require('../logger');
const http = require('http');
const EventEmitter = require('events');
const schedule = require('node-schedule');
const qs = require('querystring');

const cf_api = module.exports = {}

/* Calls method name with arguments args (from codeforces API), returns an emitter that calls 'end' returning the parsed JSON when the request ends. The emitter returns 'error' instead if something went wrong */
cf_api.call_cf_api = function(name, args, retry_times) {
	const emitter = new EventEmitter();

	emitter.on('error', (extra_info) => {
		logger.error('Call to ' + name + ' failed. ' + extra_info);
	});

	let try_;
	try_= function(times) {
		logger.info('CF request: ' + 'http://codeforces.com/api/' + name + '?' + qs.stringify(args));
		http.get('http://codeforces.com/api/' + name + '?' + qs.stringify(args), (res) => {
			if (res.statusCode !== 200) {
				res.resume();
				if(times > 0) try_(times - 1);
				else emitter.emit('error', 'Status Code: ' + res.statusCode);
				return;
			}
			res.setEncoding('utf8');

			let data = '';

			res.on('data', (chunk) => data += chunk);
			res.on('end', () => {
				let obj;
				try {
					logger.info(data.substr(0, 1000));
					obj = JSON.parse(data);
					if (obj.status == "FAILED") {
						if(times > 0) try_(times - 1);
						else emitter.emit('error', 'Comment: ' + obj.comment);
						return;
					}
				} catch(e) {
					if(times > 0) try_(times - 1);
					else emitter.emit('error', '');
					return;
				}
				emitter.emit('end', obj.result);
			}).on('error', (e) => {
				if(times > 0) try_(times - 1);
				else emitter.emit('error', e.message);
			});
		}).on('error', (e) => {
			if(times > 0) try_(times - 1);
			else emitter.emit('error', e.message);
		});
	}
	try_(retry_times);

	return emitter;
}

/* Calls cf api function 'name' every 30 seconds until condition is satisfied, and then calls callback. Tries at most for 3 days, if it is not satisfied, then it gives up. */
cf_api.wait_for_condition_on_api_call = function(name, args, condition, callback) {
	const emitter = new EventEmitter();
	let count_calls = 0;
	let handle = schedule.scheduleJob('/30 * * * * *', () => {
		cf_api.call_cf_api(name, args, 0)
			.on('end', (obj) => {
				if (condition(obj)) {
					handle.cancel();
					callback(obj);
				} else if (count_calls++ > 2 * 60 * 24 * 3) // 3 days
					handle.cancel();
			}).on('error', () => {
				if (count_calls++ > 2 * 60 * 24 * 3) // 3 days
					handle.cancel()
			});
	});
}
