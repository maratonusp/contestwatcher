const alerts = require('./alerts');
const logger = require('./logger');

/* TODO: get this list automatically */
const fetchers_list = ['codeforces', 'codechef', 'topcoder', 'csacademy', 'atcoder', 'calendar'];
const fetchers = fetchers_list.map((name) => {
	return require('./fetchers/' + name);
});

const fetch = module.exports = {};

fetch.upcoming = [];

fetch.updateUpcoming = function() {
	const upcoming = fetch.upcoming;
	upcoming.length = 0;
	alerts.reset_alerts();
	fetchers.map((fetcher) => {
		let contests = [];
		fetcher.updateUpcoming(contests).on('end', () => {
			logger.info('merging ' + fetcher.name + ' (found: ' + contests.length + ')');
			if(contests.length > 0) {
				upcoming.push.apply(upcoming, contests);
				alerts.add_alerts(contests, fetcher);
				upcoming.sort((a, b) => { return a.time - b.time; });
			}
		});
	});
}
