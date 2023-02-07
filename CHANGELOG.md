# Changelog

## 2023-02-07 - version 1.4.1
### Fixed
- The 'scroll to last read' button has found a new spot.

## 2023-02-06 - version 1.4.0
### Fixed
- Twitter changed structure slightly again. The "Mark as read" context menu item is shown again.
### Not yet fixed
- ~~The scroll to last read button doesn't have a position anymore.~~ Fixed in 1.4.1.

## 2023-01-10 - version 1.3.4
### Fixed
- Twitter very recently changed the "Latest Tweets" header to "Following" which is a trigger for the script to start. Changed accordingly.
- The check mark begore the "Mark as Read" menu item is shown again.

## 2021-06-02 - version 1.3.3
### Fixed
- Now only marking actual Promoted Tweets as promoted. Well, unless someone only tweets "Promoted". But that's their loss.

## 2021-06-02 - version 1.3.2
### Fixed
- The "Promoted" text in a Tweet was moved. Now Promoted Tweets are detected again.

## 2021-04-07 - version 1.3.1
### Fixed
- Fixed typo in the install link text in the README.

## 2021-04-07 - version 1.3
To be honest, all but the fixed bit are changes are from quite a while ago.
### Fixed
- Tweet menu selector (3 dots) is changed to follow a small change in element attributes made by Twitter. You can mark a Tweet as last read again.
### Added
- Detection and marking of promoted Tweets so they are automatically hidden.
- Improvements made to the scroll to last tweet functionality. Tweet threads are now detected and handled to not stop at a Tweet in a thread, followed by a more recent Tweet. Note the green dotted left border instead of the solid border.
### Removed
- Debugging is now disabled and no initial logging anymore.
- Detection of Tweets, used to be marked by a red right border, is now hidden. Depends on enabled state of the 'debugger'.

## 2020-07-26 - version 1.2
### Fixed
- "Mark as Read" button is not added to the Retweet menu anymore.
- Scroll to last button and functionality works better now.
### Added
- Changelog retroactively.
- Added links to changelog and license in readme.

## 2020-06-27 - version 1.1
### Fixed
- Script structure and generation so the userscript definition is now at the start.
### Added
- First version of ScrollToLastRead.
- TweetException class.
- TODO list in separate file.
- Normal (and currently promoted) Tweets have a working 'Mark as Read' option added to its existing context menu. This stores this Tweet id as last read and marks existing tweets as read.

## 2020-06-07 - version 1.0
- Initial version
