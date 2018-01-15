var d = new Date();

// note that contest times should always be ordered

module.exports = [
	// running long contest
	{ judge: 'codechef',
    name: 'January Challenge 2018',
    url: 'https://www.codechef.com/JAN18',
		time: new Date(new Date(d).setHours(d.getHours() - 7)),
    duration: 864000 },
	
	// running small contest
  { judge: 'codeforces',
    name: 'Educational Codeforces Round 36 (Rated for Div. 2)',
    url: 'http://codeforces.com/contests/915',
		time: new Date(new Date(d).setHours(d.getHours() - 1, d.getMinutes() - 10)),
    duration: 7200 },

	// upcoming 1h
  { judge: 'atcoder',
    name: 'AtCoder Grand Contest 019',
    url: 'https://agc019.contest.atcoder.jp',
		time: new Date(new Date(d).setHours(d.getHours() + 1)),
    duration: 7800 },
  { judge: 'codeforces',
    name: 'Some mock codeforces round',
    url: 'http://codeforces.com/contests/913',
		time: new Date(new Date(d).setHours(d.getHours() + 1)),
    duration: 7800 },

	// upcoming contests from different judges
  { judge: 'atcoder',
    name: 'AtCoder Grand Contest 020',
    url: 'https://agc020.contest.atcoder.jp',
		time: new Date(new Date(d).setHours(d.getHours() + 3, d.getMinutes() + 37)),
    duration: 7800 },
  { judge: 'csacademy',
    name: 'CSAcademy Round #65 (Div. 2 only)',
    url: 'https://csacademy.com/contest/round-65',
		time: new Date(new Date(d).setHours(d.getHours() + 4)),
    duration: 7200 },
  { judge: 'codeforces',
    name: 'Codecraft-18 and Codeforces Round #457 (Div. 1 + Div. 2, combined)',
    url: 'http://codeforces.com/contests/914',
		time: new Date(new Date(d).setHours(d.getHours() + 5)),
    duration: 7200 },

	// upcoming 1 day
  { judge: 'atcoder',
    name: 'AtCoder Grand Contest 021',
    url: 'https://agc21.contest.atcoder.jp',
		time: new Date(new Date(d).setHours(d.getHours() + 24)),
    duration: 7800 },
	
	// same time
  { judge: 'topcoder',
    name: 'SRM',
    url: 'https://topcoder.com',
		time: new Date(new Date(d).setHours(d.getHours() + 29)),
    duration: 6000 },

	// repetition
  { judge: 'topcoder',
    name: 'SRM',
    url: 'https://topcoder.com',
		time: new Date(new Date(d).setHours(d.getHours() + 29)),
    duration: 6000 }
]
