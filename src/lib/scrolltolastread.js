/**
 * This class contains all functionality to scroll to the last read tweet.
 * Scroll down, with a fuse on new tweet events to wait until we scroll further.
 */
class ScrollToLastRead {
	constructor() {
		this.is_running = false;
		/* Delay to continue after first tweet is loaded. */
		this.waitDelay = 500;

		/* Amount to scroll vertically from the specific tweet for clarity. */
		this.scrollPadding = -100;

		/* Stop scrolling at end op the page: */
		/* Store last body height. */
		this.lastHeight = 0;
		/* Store how often last height remained unchanged. */
		this.lastHeighRepeat = 0;
		/* After this many times unchanged we should stop scrolling down. */
		this.lastHeighRepeatLimit = 10;

		/* Attribute to set to body when we're scrolling. */
		this.body_running_attribute = 'data-scrolltolastread-running';

		// Add listener for new created tweets. This relights the fuse.
		this.newTweetListener = document.addEventListener(
			Events.NEW_TWEET,
			(event) => {
				// @todo[S] Use removeEventListener to stop listening - then move this to `this.start()` and remove running check
				// in `this.tweetAddedHandler()`.
				// But this has some issues.
				this.tweetAddedHandler(event);
			}
		)
	}

	/**
	 * Start scrolling if not yet running.
	 */
	start() {
		deb.debug('ScrollToLastRead::start', this.is_running);
		if (this.is_running) {
			return;
		}

		// First try to find a currently loaded read tweet.
		const last_read_tweet = document.querySelector('[data-tmlr-read]')
		if (last_read_tweet) {
			this.scrollToElement(last_read_tweet);
			return;
		}

		this.setRunning(true);
		this.lastHeighRepeat = 0;

		this.fuse = new Fuse(
			(fuse) => {
				this.scrollToEnd();
			},
			this.waitDelay,
			true
		);
	}

	/**
	 *
	 * @param {bool} is_running What state to set internal running to.
	 */
	setRunning(is_running) {
		this.is_running = is_running;

		if (is_running) {
			document.body.setAttribute(this.body_running_attribute, '');
		} else {
			document.body.removeAttribute(this.body_running_attribute, '');
		}
	}

	/**
	 * Stop scrolldown activity.
	 */
	stop() {
		this.setRunning(false);
		this.fuse.stop();
		document.removeEventListener(Events.NEW_TWEET, this.tweetAddedHandler);
		deb.debug('ScrollToLastRead::stopped');
	}

	/**
	 * Handle new tweet added.
	 * @param {CustomEvent} event
	 */
	tweetAddedHandler(event) {
		// If removing event handler failed.
		if (!this.is_running) {
			return;
		}

		deb.debug('ScrollToLastRead::tweetAddedHandler', event);

		// Check whether we've found a read tweet
		/** @var {Tweet} tweet */
		const tweet = event.detail.tweet;
		if (tweet && tweet.isRead()) {
			deb.debug('ScrollToLastRead::tweetAddedHandler found read tweet, stopping');
			this.stop();
			this.scrollToFirstLastRead();
		}

		// Reset fuse.
		this.fuse.relight();
	}

	/**
	 * Scrolls to the first last read tweet.
	 */
	scrollToFirstLastRead() {
		const first_tweet = document.querySelector('[data-tmlr-read]');
		deb.debug('ScrollToLastRead::scrollToFirstLastRead', first_tweet);
		if (first_tweet) {
			this.scrollToElement(first_tweet);
		}
	}

	/**
	 * Scroll element into view.
	 * @param {HTMLElement} element
	 */
	scrollToElement(element) {
		deb.debug('ScrollToLastRead::scrollToElement', element);
		if (!element) {
			return;
		}

		element.scrollIntoView();
		// Scroll up a little.
		window.scrollBy({
			top: this.scrollPadding,
			behavior: 'smooth',
		});
	}

	/**
	 * Scroll to the last tweet currently loaded.
	 * Automatically stops attempts to scroll when no more content is loaded.
	 */
	scrollToEnd() {
		if (!this.is_running) {
			return;
		}

		deb.debug(
			'ScrollToLastRead::scrollToEnd',
			this.lastHeight, window.scrollY, this.lastHeighRepeat, this.lastHeighRepeatLimit
		);

		// Scroll to the last tweet.
		[... document.querySelectorAll('[data-tmlr-tweet-id]')].pop().scrollIntoView();

		// Store current position to detect whether we've hit 'the end' (Twitter stops loading Tweets up to about 1.5 days ago).
		if (this.lastHeight === window.scrollY) {
			this.lastHeighRepeat++;
			if (this.lastHeighRepeat >= this.lastHeighRepeatLimit) {
				this.stop();
			}
		} else {
			// Update.
			this.lastHeight = window.scrollY;
			this.lastHeighRepeat = 0;
		}
	}
}
