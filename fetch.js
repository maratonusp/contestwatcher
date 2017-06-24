const alerts = require('./alerts');
const Semaphore = require('async-semaphore');

var fetchers = ['codeforces', 'codechef', 'topcoder', 'csacademy', 'atcoder', 'calendar'];
for (var i in fetchers) {
  fetchers[i] = {
    name: fetchers[i],
    object: require('./fetchers/' + fetchers[i]),
    upcoming: []
  };
}

var updateMerge = {};
updateMerge.semaphore = new Semaphore(1, true);
updateMerge.run = function (fetcher, current) {
  updateMerge.semaphore.acquire( () => {
    console.log('merging ' + fetcher.name + ' (found: ' + fetcher.upcoming.length + ')');
    var i = 0, j = 0;
    var old = Array.from(current);
    current.length = 0;

    while (i < old.length || j < fetcher.upcoming.length) {
      if (i < old.length && old[i].judge === fetcher.name) {
        i++;
      } else if (j == fetcher.upcoming.length || (i < old.length && old[i].time < fetcher.upcoming[j].time)) {
        current.push(old[i]);
        i++;
      } else {
        current.push(fetcher.upcoming[j]);
        j++;
      }
    }

    alerts.reset_alerts(current);
    updateMerge.semaphore.release();
  });
};

module.exports = {
  updateUpcoming: (upcoming) => {
    for (var i in fetchers) {
      const fetcher = fetchers[i];
      fetcher.object.updateUpcoming(fetcher.upcoming)
        .on('end', () => { updateMerge.run(fetcher, upcoming); });
    }
  }
};
