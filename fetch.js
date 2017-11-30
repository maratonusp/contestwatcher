const alerts = require('./alerts');

/* TODO: get this list automatically */
const fetchers_list = ['codeforces', 'codechef', 'topcoder', 'csacademy', 'atcoder', 'calendar'];
const fetchers = fetchers_list.map((name, index, array) => {
  return require('./fetchers/' + name);
});

module.exports = {
  updateUpcoming: (upcoming) => {
    upcoming.length = 0;
    alerts.reset_alerts();
    fetchers.map((fetcher, index, array) => {
      let contests = [];
      fetcher.updateUpcoming(contests).on('end', () => {
        console.log('merging ' + fetcher.name + ' (found: ' + contests.length + ')');
        if(contests.length > 0) {
          upcoming.push.apply(upcoming, contests);
          alerts.add_alerts(contests, fetcher);
          upcoming.sort((a, b) => { return a.time - b.time; });
        }
      });
    });
  }
};
