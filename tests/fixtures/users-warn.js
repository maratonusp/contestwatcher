module.exports = [
	// no ignore
	{
		"id": 0,
		"notify": true,
		"ignore": {},
		"last_activity": 1515838308761,
		"cf_handles": [ "arthur_nascimento" ]
	},

	// one ignore
	{
		"id": 1,
		"notify": true,
		"ignore": {
			"calendar": true
		},
		"last_activity": 1515908594649,
		"cf_handles": []
	},

	// some ignore
	{
		"id": 2,
		"notify": true,
		"ignore": {
			"codeforces": true,
			"topcoder": true,
			"calendar": true
		},
		"last_activity": 1515925361318,
		"cf_handles": []
	},

	// all ignores
	{
		"id": 5,
		"notify": true,
		"ignore": {
			"codeforces": true,
			"topcoder": true,
			"calendar": true,
			"atcoder": true,
			"codechef": true,
		},
		"last_activity": 1515925361318,
		"cf_handles": []
	},

	// notify false
	{
		"id": 3,
		"notify": false,
		"ignore": { },
		"last_activity": 1515925361318,
		"cf_handles": []
	},

	// notify false and ignores
	{
		"id": 4,
		"notify": false,
		"ignore": {
			"codeforces": true,
			"topcoder": true,
			"calendar": true
		},
		"last_activity": 1515925361318,
		"cf_handles": []
	},
]
