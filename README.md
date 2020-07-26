# Introduction
Userscript for Twitter.com that lets you keep track of the last read Tweet. Easily scroll until you reach that point.

This is finally a rewritten version of my [ArmEagle/userscripts/twitter_last_read](https://github.com/ArmEagle/userscripts/blob/master/twitter_last_read.user.js). That stopped working in the default layout somewhere in 2019. The old layout was completely removed in 2020.

This is a complete rewrite. Twitter now uses ReactJS, with uglified classnames, and much dynamic loaded content. That makes it a lot harder to hook into the website to detect tweets and actions.

This is still a work in progress.

See [changelog](CHANGELOG.md) and [license](LICENSE).

# Use

Install by [clicking here on build/scipt.user.js](https://github.com/ArmEagle/TwitterLastRead/raw/master/build/script.user.js).

This script will only let you mark original tweets as read. So; promoted (soon), retweeted tweets, will be completely disregarded.
To mark a tweet as the last read; open the popup menu of the Tweet (chevron icon at the top right) and click on "Mark read".

# Development details

This is the first time I'm using VSCode.
I've setup a Build task that uses Powershell commands to concatenate all the javascript files from `src` into `build/script.user.js`.
It then copies this all into the clipboard so I can easily paste it in the GreaseMonkey editor.

I've also installed the VSCode extension [Trigger Task on Save](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.triggertaskonsave) with the following addintion to VSCode's `settings.json`:
```json
{
	"triggerTaskOnSave.tasks": {
		"Build": [
			"src/*.js",
			"src/**/*.js"
		]
	}
}
```
