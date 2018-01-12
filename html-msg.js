const html_escape = require('true-html-escape').escape;

var hm = module.exports = {};

hm.make_link = function(string, link) {
	return '<a href="' + html_escape(link) + '">' + html_escape(string) + '</a>';
}

hm.escape = html_escape
