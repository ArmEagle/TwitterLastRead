# TODO
## Must
- Store which is last read tweet. Then compare when doing thread check. Continue scrolling somehow if tweet
is marked as a last read.

- Store last marked read tweet based on url. This to support lists.
	- Script doesn't load on Notifications yet.
- Support threads in main timeline correctly.
- Check all variable names and decide whether I want snake_case or camelcase.
- Check all function doc and put variable name after type definition (now it is nicely highlighted in VSCode).
- Separate styling / add to settings?
- Fix styling:
	- Add light/dark theme support.
	- Better colors/style.
	- Remove debug.
- Check whether (and how) we should clear Tweet classes for removed DOM elements.
    - Change `AddedNodesMutationObserver` to also have a callback for deleted nodes?
- Marking an old tweet as read (with currently read tweets above it) does not unmark all tweets correctly.
    - Perhaps this is related to the above point. Though we can't get duplicate entries in the Tweets Map.
- Detect Promoted tweets and ignore them (already some scaffolding in Tweet).
    - Attribute can be used to hide them.
- Detected Pinned Tweets and skip them (E:D).
- Perhaps use `AwaitSelectorMatchObserver` for new Tweet elements?
- Disable completely in tweet detail/threads as here there's no logical order. E.g. https://twitter.com/vogelinfo/status/1276146451974893569
