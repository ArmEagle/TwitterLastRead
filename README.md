# Introduction
Userscript for Twitter.com that lets you keep track of the last read Tweet. Easily scroll until you reach that point.

This is finally a rewritten version of my [ArmEagle/userscripts/twitter_last_read](https://github.com/ArmEagle/userscripts/blob/master/twitter_last_read.user.js). That stopped working in the default layout somewhere in 2019. The old layout was completely removed in 2020.

This is a complete rewrite. Twitter now uses ReactJS, with uglified classnames, and much dynamic loaded content. That makes it a lot harder to hook into the website to detect tweets and actions.

This is still a work in progress.

# Use

This script will only let you mark original tweets as read. So; promoted (soon), retweeted tweets, will be completely disregarded.
To mark a tweet as the last read; open the popup menu of the Tweet (chevron icon at the top right) and click on "Mark read".

