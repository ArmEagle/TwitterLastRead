// ==UserScript==
// @name	Twitter - Mark Last Read
// @version 1.3.4
// @grant   none
// @include https://*twitter.com/*
// ==/UserScript==
class TweetException extends Error {
	constructor(message, details) {
		this.details = details;

		Error(message);
	}
}
class Events {}
/**
 * Event fired when a new {Tweet} was created.
 */
Events.NEW_TWEET = 'new_tweet';

/**
 * Event fired when scroll to last read starts.
 */
Events.SCROLL_TO_LAST_READ_START = 'scroll_to_last_read_start';

/**
 * Event fired when scroll to last read stops.
 */
Events.SCROLL_TO_LAST_READ_STOP = 'scroll_to_last_read_stop';
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
	}

	/**
	 * Start scrolling if not yet running.
	 */
	start() {
		deb.debug('ScrollToLastRead::start', this.is_running);
		if (this.is_running) {
			return;
		}

		// Fire event.
		document.dispatchEvent(new CustomEvent(Events.SCROLL_TO_LAST_READ_START));

		// First try to find a currently loaded read tweet.
		const last_read_tweet = document.querySelector('[data-tmlr-read]:not([data-tmlr-thread-id])')
		if (last_read_tweet) {
			this.scrollToElement(last_read_tweet);
			return;
		}

		this.setRunning(true);

		// Add listener for new created tweets. This relights the fuse.
		this.newTweetListener = document.addEventListener(
			Events.NEW_TWEET,
			(event) => {
				this.tweetAddedHandler(event);
			}
		)

		this.lastHeighRepeat = 0;

		this.fuse = new Fuse(
			(fuse) => {
				if (this.is_running) {
					this.scrollToEnd();
				} else {
					this.scrollToFirstLastRead();
				}
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

		// @todo Change this to use the start/stop events.
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

		// Fire event.
		document.dispatchEvent(new CustomEvent(Events.SCROLL_TO_LAST_READ_STOP));

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

		/** @var {Tweet} tweet */
		const tweet = event.detail.tweet;

		// Small delay for other tweets to be handled first too.
		// That other logic handles threaded tweets only after subsequent Tweets are loaded and handled.
		window.setTimeout(() => {
			this.checkTweet(tweet);
		}, 100);
	}

	/**
	 * Check the tweet.
	 * @param {Tweet} tweet
	 */
	checkTweet(tweet) {
		// Reset fuse.
		this.fuse.relight();

		// Check whether we've found a read tweet. Don't want to check thread tweets.
		if (tweet && tweet.isRead() && !tweet.getThreadId()) {
			deb.debug('ScrollToLastRead::tweetAddedHandler found read tweet, stopping', tweet.element.outerHTML);
			this.stop();
			this.scrollToElement(tweet.getElement());
		}
	}

	/**
	 * Scrolls to the first last read tweet, not a thread tweet.
	 */
	scrollToFirstLastRead() {
		const first_tweet = document.querySelector('[data-tmlr-read]:not([data-tmlr-thread-id])');
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
		deb.debug('ScrollToLastRead::scrollToElement', element, element.outerHTML);
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
/**
 * Class to handle all things about a tweet element.
 */
class Tweet {

	/**
	 * @param {TwitterMarkLastRead} tmlr
	 * @param {HTMLElement} element Root tweet element.
	 */
	constructor(tmlr, element) {
		deb.debug('Tweet::constructor');

		this.tmlr = tmlr;
		this.element = element;

		this.selector_more_menu = '[role="button"][aria-haspopup="menu"][aria-label="More"]';

		this.key_tweet_markread_checked = 'data-tmlr-checked'; // Flag that marks that this tweet was checked.
		this.tweet_handled_attribute = 'data-tmlr-handled'; // Flag that marks that this element has been handled.
		this.key_tweet_id = 'data-tmlr-tweet-id'; // Stores the tweet id.
		this.state_thread_id = 'data-tmlr-thread-id'; // This tweet is part of a thread. Contains id of latest tweet.

		this.state_read = 'data-tmlr-read'; // This tweet is marked as read.
		this.state_retweet = 'data-tmlr-retweet'; // This tweet is a retweet.
		this.state_like = 'data-tmlr-like'; // @todo // not shown anymore? setting?
		this.state_promoted = 'data-tmlr-promoted'; // @todo This is a promoted tweet.

		this.state_last_read_tweet = 'data-tmlr-last-read-tweet'; // This tweet is marked as the last read tweet.
	}

	init() {
		// Prevent double run on tweet element.
		if (this.element.hasAttribute(this.tweet_handled_attribute)) {
			return;
		}
		this.element.setAttribute(this.tweet_handled_attribute, true);

		deb.debug('Tweet::init', this.element);
		this.addEventListeners();

		this.checkTweet(this.tmlr.getLastReadId());

		// Fire event.
		document.dispatchEvent(new CustomEvent(
			Events.NEW_TWEET, {
				detail: {
					tweet: this,
				},
			}
		));

		deb.debug('Tweet::init::end', this.element);
	}

	/**
	 * Add eventlisteners specifically for the Tweet itself.
	 */
	addEventListeners() {
		deb.debug('Tweet::addEventListeners');
		// Listen to "more" menu dropdown opening.
		// This menu is stored independently from the tweet.
		// Pass 'active' tweet id to TMLR so it knows for which Tweet the menu was opened.
		if (this.isNormal()) {
			const popupHook = this.element.querySelector(this.selector_more_menu);
			if (!popupHook) {
				throw new TweetException('Could not find Tweet context menu dropdown hook.', {
					tweet: this,
				});
			} else {
				popupHook.addEventListener('click', (event) => {
					deb.debug('Tweet::popupHook', event, this.getId());
					this.tmlr.setPopupActiveTweet(this);
				});
			}
		} else {
			// Reset for other tweet types so we don't add the "Mark all Read" button elsewhere once this is set once.
			this.tmlr.setPopupActiveTweet(null);
		}

		// Reset active tweet when clicking the in the tweet container.
		// This prevents the active tweet causing the "Mark all Read" button to appear for subsequent other element
		// clicks like when clicking on "Retweet".
		this.element.addEventListener('click', (event) => {
			if (
				event.target.matches(this.selector_more_menu)
				|| event.target.closest(this.selector_more_menu)
			) {
				return;
			}

			deb.debug('Tweet::popupHook reset', event, this.getId());
			this.tmlr.setPopupActiveTweet(null);
		});

		deb.debug('Tweet::addEventListeners::end');
	}

	/**
	 * Check Tweet: for type and whether tweet should be marked as already read.
	 * @param {StringBigInt|null} lastReadId
	 * @param {boolean} force If set, ignore the attribute that marks already being checked.
	 */
	checkTweet(lastReadId, force) {
		deb.debug('Tweet::checkTweet', lastReadId, this.element);

		if (!lastReadId) {
			return;
		}

		if (!force && this.checkAttribute(this.key_tweet_markread_checked)) {
			return;
		}

		if (this.isPromotedElement()) {
			deb.debug('Tweet::checkTweet-detail', 'is promoted');
			this.element.setAttribute(this.state_promoted, '');
		} else if (this.isRetweetElement()) {
			deb.debug('Tweet::checkTweet-detail', 'is retweet');
			this.element.setAttribute(this.state_retweet, '');
		} else {
			const tweetId = this.getId();
			const tweetThreadId = this.getThreadId();
			this.threadCheck(lastReadId);

			if (this.getId().compare(lastReadId) <= 0) {
				deb.debug('Tweet::checkTweet-detail', 'mark as read', this.getId(), '<=', lastReadId);
				this.element.setAttribute(this.state_read, '');
			} else {
				deb.debug('Tweet::checkTweet-detail', 'new tweet', this.getId(), '>', lastReadId);
				this.element.removeAttribute(this.state_read);
			}
		}
	}

	/**
	 * Check for thread state.
	 * @param {StringBigInt|null} lastReadId
	 */
	threadCheck(lastReadId) {
		deb.debug('Tweet::threadCheck', this);
		const tweet_id = this.getStringId();

		const all_id_tweets = document.querySelectorAll('[' + this.key_tweet_id + ']');
		// Iterate over until we find this Tweet.
		let index = [... all_id_tweets].findIndex((tweet_element) => {
			const it_tweet_id = tweet_element.getAttribute(this.key_tweet_id);
			return it_tweet_id === tweet_id;
		});

		// No match or useless match when first.
		if (index <= 0) {
			return;
		}

		// Keep going back until newer tweet id or retweet.
		while (index > 0) {
			index--;
			const current_tweet_id = all_id_tweets[index].getAttribute(this.key_tweet_id);
			const current_tweet = this.tmlr.getTweet(current_tweet_id);
			// Break when we couldn't load the Tweet, tweet id is increasing, or this is a retweet.
			if (!current_tweet || current_tweet_id >= tweet_id || current_tweet.isRetweet()) { //@todo promoted
				deb.debug('Tweet::threadCheck break', current_tweet, current_tweet_id, tweet_id, index);
				// Fail.
				break;
			}

			if (current_tweet_id < tweet_id) {
				// Set attribute with initial thread id.
				const current_thread_id = current_tweet.element.getAttribute(this.state_thread_id);

				// Set, or update with highest tweet id of thread.
				if (!current_thread_id || current_thread_id < tweet_id) {
					current_tweet.element.setAttribute(this.state_thread_id, tweet_id);
				}

				deb.debug('Tweet::threadCheck CHECKED thread', current_tweet, current_tweet_id, tweet_id, current_thread_id);
			}
		}

		deb.debug('Tweet::threadCheck end', index, this, tweet_id);
	}

	/**
	 * @return {boolean} Whether this is a retweet.
	 */
	isRetweet() {
		return this.element.hasAttribute(this.state_retweet);
	}

	/**
	 * @return {boolean} Whether this is a liked tweet.
	 */
	isLike() {
		return this.element.hasAttribute(this.state_like);
	}

	/**
	 * @return {boolean} Whether this is a promoted tweet.
	 */
	isPromoted() {
		return this.element.hasAttribute(this.state_promoted);
	}

	/**
	 * @return {boolean} Whether this is a normal tweet.
	 */
	isNormal() {
		return !this.isRetweet() && !this.isLike() && !this.isPromoted();
	}

	/**
	 * @return {boolean} Whether this tweet is marked read.
	 */
	isRead() {
		return this.element.hasAttribute(this.state_read);
	}

	/**
	 * Check whether an attribute is already set, and set it if it isn't yet.
	 * @param {string} data_key
	 * @param {string} value Value for attribute, defaults to {true}.
	 * @return {boolean} Whether the attribute was already set.
	 */
 	checkAttribute(data_key, value) {
		deb.debug('Tweet::checkAttribute');
		if (typeof value === 'undefined') {
			value = 'true';
		}

		if (this.element.hasAttribute(data_key)) {
			return true;
		}
		this.element.setAttribute(data_key, value);

		return false;
	}

	/**
	 * @return {StringBigInt} Tweet id
	 * @throws When id not found
	 */
	getId() {
		deb.debug('Tweet::getId');

		if (this.id) {
			return this.id;
		}

		const time_link = this.element.querySelector('time').closest('a');
		if (!time_link) {
			throw new TweetException('Time element not found', {
				tweet: this,
			});
		}

		// Grab trailing long number
		const tweet_id_matches = time_link.getAttribute('href').match(/\d+$/);
		if (!tweet_id_matches || !tweet_id_matches.length) {
			throw new TweetException('Tweet id not found', {
				tweet: this,
			});
		}

		this.id = new StringBigInt(tweet_id_matches[0]);
		this.element.setAttribute(this.key_tweet_id, this.id.toString());

		return this.id;
	}

	/**
	 * @return {StringBigInt|null} Id of latest tweet of thread or null when not set.
	 */
	getThreadId() {
		const id = this.element.getAttribute(this.state_thread_id);
		return id ? new StringBigInt(id) : null;
	}

	/**
	 * @return {String} Id converted to String.
	 */
	getStringId() {
		return this.getId().toString();
	}

	/**
	 * Check whether this Tweet element is a Retweeted tweet.
	 * @return {boolean}
	 */
	isRetweetElement() {
		deb.debug('Tweet::isRetweet');

		// First `a span` can contain a span with the person retweeting and the text " Retweeted".
		const span = this.element.querySelector('a span');
		return span && span.textContent.indexOf(' Retweeted') > 0;
	}

	/**
	 * Check whether this Tweet element is a Promoted tweet.
	 * @return {boolean}
	 */
	isPromotedElement() {
		deb.debug('Tweet::isPromotedElement', this.element, this.element.innerHTML);

		// Check for a span element containing "Promoted".
		return Array.from(this.element.querySelectorAll('span')).filter(
			(span) => span.textContent.indexOf('Promoted') >= 0 && span.textContent.replace('Promoted', '').trim().length === 0
		).length > 0;
	}

	/**
	 * Whether this Tweet still has an element.
	 * @return {boolean}
	 */
	hasElement() {
		return !!this.element;
	}

	/**
	 * Return the HTML element of this Tweet.
	 * @return {HTMLElement}
	 */
	getElement() {
		return this.element;
	}
}
/**
 * Class that waits for appearance of and handles an opened Tweet popup menu.
 */
class TweetMenu {

	/**
	 * @param {TwitterMarkLastRead} tmlr
	 */
	constructor(tmlr) {
		this.tmlr = tmlr;
		this.tweetMenuWrapper = null;

		this.tweetmenu_handled_attribute = 'data-tmlr-handled';

		this.mutationSelector = '[role="menu"]';
		this.mutationRootSelector = '#react-root';
		this.SVG_NS = 'http://www.w3.org/2000/svg';

		this.init();
	}

	init() {
		deb.debug('TweetMenu::init');

		this.tweetMenuAddedObserver = new AwaitSelectorMatchObserver(
		this.mutationSelector,
			(element) => {
				// Is changed twice quickly and first time it isn't ready yet. F* that, we'll just wait a bit here.
				window.setTimeout(() => {
					this.handleAddedNode(element);
					}, 100);
			},
			this.mutationRootSelector
		);
	}

	/**
	 * Handle an observed added element.
	 * Try to find the menuitems.
	 *
	 * @param {HTMLElement} element
	 */
	handleAddedNode(element) {
		if (element.hasAttribute(this.tweetmenu_handled_attribute)) {
			return;
		}

		if (element.querySelectorAll('[role="menuitem"]').length < 2) {
			deb.debug('TweetMenu::no(t enough) menuitems (yet)', element);
			return;
		}

		element.setAttribute(this.tweetmenu_handled_attribute, '');
		this.menuWrapper = element;
		this.menuContainer = this.getMenuContainer();
		if (!this.menuContainer) {
			return;
		}

		deb.debug('TweetMenu::handleAddedNode', element);

		this.addMenuItems();
	}

	/**
	 * Add the custom menu items:
	 * - Mark as Read.
	 */
	addMenuItems() {
		const activeTweet = this.tmlr.getPopupActiveTweet();
		if (!activeTweet) {
			console.error('No active tweet found to set as last read');
			return;
		}
		if (activeTweet.isNormal()) {
			this.addMenuItem(
				'Mark as Read',
				(event) => {
					deb.debug('TweetMenu::addMenuItems', event, activeTweet);
					this.tmlr.setLastReadId(activeTweet.getId());
				}
			);
		}
	}

	/**
	 * @param label {string} Label for the menu item.
	 * @param callback {callback} Callback method to call when clicked.
	 */
	addMenuItem(label, callback) {
		// Check whether we have added this already.
		if (this.menuContainer.querySelector('[role="menuitem"][data-tmlr-menuitem="' + label + '"]')) {
			return;
		}
		const wrapper = document.createElement('div');
		wrapper.setAttribute('role', 'menuitem');
		wrapper.setAttribute('data-tmlr-menuitem', label);
		wrapper.setAttribute('style', 'display: flex; flex-direction: row;');


		const icon_div = document.createElement('div');
		icon_div.setAttribute('style', 'display: flex; max-width: 28px; width: 21px; padding-right: 10px;');

		const icon = document.createElementNS(this.SVG_NS, 'svg');
		icon.setAttributeNS(null, 'viewBox', '0 0 24 24');
		icon.setAttributeNS(null, 'stroke-width', '3');
		icon.setAttributeNS(null, 'stroke', 'white');
		icon.setAttributeNS(null, 'fill', 'none');
		icon.setAttributeNS(null, 'style', 'margin-right: 6px;');
		icon_div.appendChild(icon);
		const icon_g = document.createElementNS(this.SVG_NS, 'g');
		icon.appendChild(icon_g);
		const icon_path = document.createElementNS(this.SVG_NS, 'path');
		icon_path.setAttributeNS(null, 'd', 'M2 15 L9 21 22 3');
		icon_g.appendChild(icon_path);
		wrapper.appendChild(icon_div);

		const span_div = document.createElement('div');
		span_div.setAttribute('style', 'display: flex;');

		const span = document.createElement('span');
		span.textContent = label;
		span_div.appendChild(span);
		wrapper.appendChild(span_div);

		wrapper.addEventListener('click', (event) => {
			event.preventDefault();
			deb.debug('TweetMenu::click', wrapper);
			this.closePopup();
			callback(event);
		});

		this.menuContainer.appendChild(wrapper);
	}

	/**
	 * Closes the popup.
	 *
	 * This is a bit tricky. Somewhere there's a 'great uncle' element that covers the whole page.
	 * This element is part of the DOM structucture that was added when the popup was opened.
	 *
	 * We're just going to spread some love to the siblings several steps up (sending a click event).
	 * One of them is this element that will make the popup close.
	 */
	closePopup() {
		[... this.menuContainer.closest('[role="menu"]').parentElement.childNodes].forEach((elem) => {
			// @todo[c] Could check when the popup menu DOM structure is gone and then stop.
			elem.dispatchEvent(new MouseEvent('click', {view: window, bubbles: true}));
		});
	}

	/**
	 * @return {HTMLElement} Element that is direct parent of menuitems.
	 */
	getMenuContainer() {
		const menuitem = this.menuWrapper.querySelector('[role="menuitem"]');
		if (!menuitem) {
			console.error('No menuitem found in menu', this.tweetMenuWrapper);
			return;
		}

		return menuitem.parentNode;
	}
}
/**
 * Implements an observer for all added nodes under the given root node (or body when root is not defined).
 * Can be stopped by calling disconnect.
 */
class AddedNodesMutationObserver {
	/**
	 * @param rootSelector {string} Selector for root node to listen on.
	 * @param callback{Function} Callback to call on all added nodes.
	 */
	constructor(rootSelector, callback) {
		deb.debug('AddedNodesMutationObserver::constructor');

		this.rootSelector = rootSelector;
		this.callback = callback;

		this.rootNode = document.querySelector(this.rootSelector);

		// Options for addednodes
		this.config = {
			childList: true,
			subtree: true
		};

		this.initialize();
	}

	/**
	 * Initialize the observer
	 */
	initialize() {
		deb.debug('AddedNodesMutationObserver::initialize');

		if (!this.observer) {
			// Create observer with callback function to execute when mutations are observed
			this.observer = new MutationObserver((mutationsList, observer) => {
				for (let mutation of mutationsList) {
					if (mutation.type === 'childList' && typeof mutation.addedNodes !== 'undefined') {
						mutation.addedNodes.forEach((element) => {
							this.callback(element);
						});
					}
				}
			});
		}
	}

	/**
	 * Start the observer.
	 */
	observe() {
		deb.debug('AddedNodesMutationObserver::observe');

		// Start observing the root node for configured mutations
		this.observer.observe(this.rootNode, this.config);
	}

	/**
	 * Stop the observer.
	 */
	disconnect() {
		deb.debug('AddedNodesMutationObserver::disconnect');

		if (this.observer) {
			this.observer.disconnect();
		}
	}
}
/**
 * This class awaits for an element matching a selector to appear before calling a callback.
 */
class AwaitSelectorMatchObserver {
	/**
	 * @param selector {string} for element to wait for.
	 * @param callback {Function} Callback to call with selector element.
	 * @param rootSelector {string} (optional) Selector for root node to listen on. Defaults to document.body.
	 */
	constructor(selector, callback, rootSelector) {
		deb.debug('AwaitSelectorMatchObserver::constructor');

		this.selector = selector;
		this.callback = callback;

		if (typeof rootSelector === 'undefined') {
			rootSelector = 'body';
		}

		this.addedNodesMutationObserver = new AddedNodesMutationObserver(
			rootSelector,
			(element) => {
				this.nodeAddedHandler(element);
			}
		);
		this.addedNodesMutationObserver.observe();
	}

	/**
	 * Handle added nodes.
	 * @param addedElement {HTMLElement} any added element
	 */
	nodeAddedHandler(addedElement) {
		deb.debug('AwaitSelectorMatchObserver::nodeAddedHandler');


		if (addedElement.matches(this.selector)) {
			return this.callbackWrapper(addedElement);
		}

		let element = addedElement.closest(this.selector);
		if (element) {
			return this.callbackWrapper(element);
		}

		let elements = addedElement.querySelectorAll(this.selector);
		[... elements].forEach((element) => {
			this.callbackWrapper(element);
		});
	}
	
	/**
	 * Wraps set callback function.
	 */
	callbackWrapper(element) {
		deb.debug('AwaitSelectorMatchObserver::callbackWrapper', element);
		this.callback(element);
	}
	
	/**
	 * Stop observing.
	 */
	disconnect() {
		this.addedNodesMutationObserver.disconnect();
	}
}
class Debug {
	/**
	 * @param {RegExp} Debug string should match this regular expression to be logged.
	 */
	constructor(filter) {
		this.filter = filter;
		this.enabled = false;
		this.debug('Debug::constructor'); //@debug
	}

	/**
	 * @param {string} String to log.
	 * @param[] {mixed} More arguments to log.
	 */
	debug(string) {
		if (
			!this.filter
			|| this.isEnabled() && string.match(this.filter)
		) {
			console.debug([...arguments]);
		}
	}

	/**
	 * Disable debug output.
	 */
	disable() {
		this.enabled = false;
	}

	/**
	 * Enable debug output;
	 */
	enable() {
		this.enabled = true;
	}

	/**
	 * @return bool Whether debugging is enabled.
	 */
	isEnabled() {
		return this.enabled;
	}
}
/**
 * Class that easily delays an action.
 */
class Fuse {
	/**
	 * @param {function} callback Callback to call when the fuse has run out. The Fuse object instance is passed along.
	 * @param {int} delay Fuse delay in seconds.
	 * @param {boolean} is_interval Use (repeat) interval instead of (single) timeout.
	 */
	constructor(callback, delay, use_interval) {
		this.callback = callback;
		this.setDelay(delay);
		this.use_interval = use_interval;

		this.relight();
	}

	/**
	 * Start the fuse.
	 */
	start() {
		deb.debug('Fuse::start');

		this.stop();

		this.timer = this.use_interval
			? window.setInterval(() => {
				deb.debug('Fuse::callback interval');
				this.callback(this);
			}, this.delay)
			: window.setTimeout(() => {
				deb.debug('Fuse::callback timeout');
				this.callback(this);
			}, this.delay);
	}

	/**
	 * Reset timeout. Only when timer is still active.
	 */
	relight(force) {
		deb.debug('Fuse::relight');

		if (!this.timer) {
			this.start();
		}
	}

	/**
	 * Blow out the fuse.
	 */
	stop() {
		deb.debug('Fuse::stop');
		if (this.timer) {
			this.use_interval
				? window.clearInterval(this.timer)
				: window.clearTimeout(this.timer);
		}
	}

	/**
	 * @param {int} delay Delay in seconds to use from now on.
	 */
	setDelay(delay) {
		deb.debug('Fuse::setDelay');
		this.delay = delay;
	}
}
/**
 * Helper class to make use of LocalStorage even simpler.
 * Handles serialisation of JSON to storage and back.
 *
 * Create by passing a key to use as name for your storage:
 * `let storage = new LocalJsonStorage('mysetting');`
 */
class LocalJsonStorage {
	/**
	 * @constructor
	 * @param key {string} Key to use for this storage
	 * @param prefix {string} (optional) Prefix for key, defaults to 'iwink-userscripts-'
	 */
	constructor(key, prefix) {
		this.keyPrefix = (typeof prefix === 'undefined') ? 'userscripts-' : prefix;

		if (typeof key === 'undefined' || !key) {
			throw new Exception('parameter "key" is required');
		}

		this.storageKey = this.keyPrefix + key;
	}

	/**
	 * Retrieve deserialised stored data.
	 * @return {*}
	 */
	get() {
		let data = localStorage[this.storageKey];
		if (typeof data !== 'string' || data === 'undefined') {
			return undefined;
		}
		return JSON.parse(data);
	}

	/**
	 * Store data. Serialises the data.
	 * @param data {*}
	 */
	set(data) {
		localStorage[this.storageKey] = JSON.stringify(data);
	}
}
/**
 * Persistent storage using LocalJsonStorage class.
 */
class Settings {
	/**
	 * @param {string} key
	 * @param {*} defaultConfig
	 */
	constructor(key, defaultConfig) {
		this.storage = new LocalJsonStorage(key);
		if (!this.storage.get()) {
			this.storage.set(defaultConfig);
		}
	}

	/**
	 * Retrieve a value.
	 * @param {string} key
	 * @return {*}
	 */
	get(key) {
		const settings = this.storage.get();
		return settings[key];
	}

	/**
	 * Store a value.
	 * @param {string} key
	 * @param {*} data
	 */
	set(key, data) {
		const settings = this.storage.get();
		settings[key] = data;
		this.storage.set(settings);
	}
}
/**
 * Twitter IDs are pretty large. Big numbers aren't supported yet.
 * This class will convert integers to zero padded strings.
 * Comparison is then simply done as string comparison.
 */
class StringBigInt {
	/**
	 * @param {int} value
	 */
	constructor (value) {
		// Number of 'digits' to use so we can always do string comparison of tweet ids by prepending zeros.
		this.valueSize = 24;
		this.value = this.padZeros('' + value);
	}

	/**
	 * @param {int} val
	 */
	padZeros(val) {
		while (val.length < this.valueSize) {
			val = '0' + val;
		}
		return val;
	}

	/**
	 * @return {string}
	 */
	toJSON() {
		return this.valueOf();
	}

	/**
	 * @return {string}
	 */
	toString() {
		return this.valueOf();
	}

	/**
	 * @return {string}
	 */
	valueOf() {
		return this.value;
	}

	/**
	 * Compare with other value.
	 * @param {StringBigInt} other
	 * @return int From string comparison.
	 */
	compare(other) {
		deb.debug('StringBigInt::compare', this.toString(), other.toString(), this.toString().localeCompare(other.toString(), 'en'));
		return this.toString().localeCompare(other.toString(), 'en');
	}
}
/**
 * Base class.
 */
class TwitterMarkLastRead {
	constructor() {
		deb.debug('TwitterMarkLastRead::constructor');

		if (!this.isChronologicalStream()) {
			console.log('TwitterMarkLastRead: Not loading because we have no chronological stream');
			return;
		}
		this.SVG_NS = 'http://www.w3.org/2000/svg';

		this.settings = new Settings('tmlr', {
			'lastread': false,
		});
		this.lastReadId = this.settings.get('lastread') || false;
		this.scrollToLastRead = new ScrollToLastRead();

		/** @property {Map.<StringBigInt, Tweet>} Map with loaded Tweet objects. **/
		this.tweets = new Map();

		/** @property {Tweet} Tweet the popup menu was last opened for. **/
		this.popupActiveTweet;

		this.mutationRootSelector = '#react-root';
		this.timeline_container = document.querySelector('[aria-label="Timeline: Search timeline"]');

		this.addStyling();
		this.setupMutationObservers();
	}

	/**
	 * Start mutation observer to find new tweet elements.
	 */
	setupMutationObservers() {
		deb.debug('TwitterMarkLastRead::setupMutationObservers');

		this.tweetAddedObserver = new AddedNodesMutationObserver(
  		this.mutationRootSelector,
			(element) => {
				this.handleAddedNode(element);
			}
		);
		this.tweetAddedObserver.observe();

		this.tweetMenuHandler = new TweetMenu(this);
	}

	/**
	 * Handle an observed added element.
	 * Try to find the tweets (self, parent, or multiple children).
	 *
	 * @param {HTMLElement} element
	 * @return {HTMLElement[]} Tweet elements
	 */
	handleAddedNode(element) {
		deb.debug('TwitterMarkLastRead::handleAddedNode', element);
		this.addScrolldownButton();

		const tweetElements = this.findTweetElements(element);
		if (!tweetElements || !tweetElements.length) {
			return;
		}

		tweetElements.forEach((tweet) => {
			this.handleTweet(tweet);
		});
	}

	/**
	 * Find the element that we regard to be a tweet element.
	 * @param {HTMLElement} element
	 * @return {HTMLElement[]}
	 */
	findTweetElements(element) {
		deb.debug('TwitterMarkLastRead::findTweetElement', element);

		if (element.tagName.toLowerCase() === 'article') {
			return [element];
		}

		let tweet = element.closest('article');
		if (tweet) {
			return [tweet];
		}

		let tweets = element.querySelectorAll('article');
		return tweets;
	}

	/**
	 * Do the thing.
	 *
	 * @param {HTMLElement} tweetElement
	 */
	handleTweet(tweetElement) {
		deb.debug('TwitterMarkLastRead::handleTweet', tweetElement);
		if (deb.isEnabled()) {
			tweetElement.setAttribute('data-tmlr-debug', ''); //@debug
		}

		// Not when in modal
		/*
		if (tweetElement.closest('[aria-modal]')) {
			deb.debug('TwitterMarkLastRead::handleTweet::isInModal', tweetElement);
			return;
		}
		*/

		const tweet = new Tweet(this, tweetElement);
		tweet.init();


		deb.debug('TwitterMarkLastRead::handleTweet', 'addTweet');
		this.addTweet(tweet);
	}

	/**
	 * Add tweet to list.
	 * @param {Tweet} tweet
	 */
	addTweet(tweet) {
		deb.debug('TwitterMarkLastRead::addTweet', tweet);
		this.tweets.set(tweet.getStringId(), tweet);
		deb.debug('TwitterMarkLastRead::addTweet::length', Array.from(this.tweets.keys()).length);
	}

	/**
	 * Return Tweet object for given id.
	 * @param {id} tweetid
	 * @return {Tweet}
	 */
	getTweet(tweetid) {
		return this.tweets.get(tweetid);
	}

	/**
	 * Remove a tweet from list.
	 * @param {Tweet} tweet
	 */
	removeTweet(tweet) {
		deb.debug('TwitterMarkLastRead::removeTweet', tweet);
		this.tweets.delete(tweet.getStringId());
	}

	/**
	 * Return an array prepresentation of current tweets.
	 * This is a copy. Modifications can be made with `addTweet` and `deleteTweet`
	 * while iterating through this array.
	 * @return {Tweet[]}
	 */
	getTweets() {
		const tweets = Array.from(this.tweets.values()); // am having issues with using the Map or Iterator versions. So using Array for now.
		deb.debug('TwitterMarkLastRead::getTweets', tweets);
		return tweets;
	}

	addStyling() {
		const style = document.createElement('style');
		style.setAttribute('type', 'text/css');
		// @todo dark / white theme; body has dynamic background-color style.
		style.textContent = `
			[data-tmlr-read] {
				border-left: 3px solid #90ff7c;
			}
			[data-tmlr-retweet] {
				border-left: 3px solid #7c98ff;
			}
			[data-tmlr-promoted] {
				height: 0;
			}
			[data-tmlr-read][data-tmlr-retweet] {
				border-left: 3px solid #7c98aa;
			}
			[data-tmlr-debug] {
				border-right: 3px solid #ff907c;
			}
			[data-tmlr-read][data-tmlr-thread-id] {
				border-left: 3px dotted #b0ff9c;
			}
			[data-tmlr-menuitem] {
				color: white;
				padding: 12px 16px;
				font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
				font-size: 15px;
				cursor: pointer;
			}
			[data-tmlr-menuitem]:hover {
				background-color: rgb(25, 39, 52);
			}
			[data-tmlr-scrolldown-button] {
				min-width: 39px;
				min-height: 39px;
				display: flex;
				flex-direction: row;
				border-radius: 9999px;
				border-width: 1px;
				border-color: rgba(0, 0, 0, 0);
				border-style: solid;
				align-items: center;
			}
			[data-scrolltolastread-running] [data-tmlr-scrolldown-button] {
				opacity: 0.5;
				cursor: wait;
			}
			[data-tmlr-scrolldown-button]:hover {
				background-color: rgba(69, 121, 242, 0.1);
			}
			[data-tmlr-scrolldown-button] [data-tmlr-inner] {
				display: flex;
				justify-content: center;
				width: 100%;
			}
		`;

		document.body.appendChild(style);
	}

	/**
	 * Check whether the page is showing a chronological stream.
	 * @return {bool}
	 */
	isChronologicalStream() {
		// Home needs "Following" set (in a h2).
		if (location.pathname === '/home') {
			return !!this.getLatestTweetsHeader();
		}

		// Or Search on "Latest"
		if (location.pathname.indexOf('/search') === 0) {
			return location.search.indexOf('f=live') > 0;
		}

		return false;
	}

	/**
	 * @return {HTMLElement|null} The h2 header with "Following" content, or null.
	 */
	getLatestTweetsHeader() {
		const headers = [... document.querySelectorAll('h2')].filter((h) => {
			return h.textContent.indexOf('Following') >= 0;
		});

		return headers.length > 0
			? headers[0]
			: null;
	}

	/**
	 * @return {StringBigInt} The last read Tweet id.
	 */
	getLastReadId() {
		return this.lastReadId;
	}

	/**
	 * @param tweetId {StringBigInt} The last read Tweet id.
	 */
	setLastReadId(tweetId) {
		// @todo
		deb.debug('TwitterMarkLastRead::setLastReadId 1', '' + tweetId);
		this.lastReadId = new StringBigInt(tweetId);
		this.settings.set('lastread', this.getLastReadId());
		deb.debug('TwitterMarkLastRead::setLastReadId 2', '' + tweetId);
		// Mark all current tweets as read.
		this.getTweets().forEach((tweet) => {
			deb.debug('TwitterMarkLastRead::setLastReadId 3', '' + tweetId, tweet);
			if (!tweet.hasElement()) {
				deb.debug('TwitterMarkLastRead::setLastReadId::tweet', 'has no element');
				this.removeTweet(tweet.getId());
				return;
			}
			deb.debug('TwitterMarkLastRead::setLastReadId::tweet recheck', tweet);
			try {
				tweet.checkTweet(this.getLastReadId(), true);
			} catch (error) {
				console.error(error);
			}
		});
	}

	/**
	 * @param tweet {Tweet}
	 */
	setPopupActiveTweet(tweet) {
		this.popupActiveTweet = tweet;
	}

	/**
	 * @return {Tweet}
	 */
	getPopupActiveTweet() {
		return this.popupActiveTweet;
	}

	/**
	 * Adds the scrolldown button to the header.
	 */
	addScrolldownButton() {
		const scrolldown_attribute = 'data-tmlr-scrolldown-button';

		// No duplicates.
		if (document.querySelector('[' + scrolldown_attribute + ']')) {
			return;
		}

		const header = this.getLatestTweetsHeader();
		if (!header) {
			deb.debug('TwitterMarkLastRead::addScrolldownButton: Could not find "Following" header!');
		}

		// Go up into the DOM tree until we can find a [role="button"].
		let walk = header;
		while (!walk.querySelector('[role="button"]')) {
			walk = walk.parentNode;
			if (walk.tagName.toLowerCase() === 'body') {
				deb.debug('TwitterMarkLastRead::addScrolldownButton: Could not find button in header!');
			}
		}
		// Then the parent of that button element is our target.
		// Make wider and change flex orientation.
		const other_button = walk.querySelector('[role="button"]');
		const target = other_button.parentNode;
		target.style['min-width'] = '80px';
		target.style['flex-direction'] = 'row';

		const wrapper = document.createElement('div');
		wrapper.setAttribute('role', 'button');
		wrapper.setAttribute(scrolldown_attribute, '');
		wrapper.setAttribute('title', 'Twitter Mark Last Read: Scroll to last read');
		const inner = document.createElement('div');
		inner.setAttribute('data-tmlr-inner', '');
		wrapper.appendChild(inner);
		const svg = document.createElementNS(this.SVG_NS, 'svg');
		svg.setAttributeNS(null, 'viewBox', '0 0 32 32');
		svg.setAttributeNS(null, 'style', 'max-width: 28px;');
		const g = document.createElementNS(this.SVG_NS, 'g');
		svg.appendChild(g);
		const path1 = document.createElementNS(this.SVG_NS, 'path');
		path1.setAttributeNS(null, 'd', 'M30,0H2C0.895,0,0,0.895,0,2v28c0,1.105,0.895,2,2,2h28c1.104,0,2-0.895,2-2V2C32,0.895,31.104,0,30,0z M30,30H2V2h28V30z');
		path1.setAttributeNS(null, 'fill', 'rgb(29, 161, 242)');
		g.appendChild(path1);
		const path2 = document.createElementNS(this.SVG_NS, 'path');
		path2.setAttributeNS(null, 'd', 'M27,12.106   c0-0.564-0.489-1.01-1.044-0.995H6.013c-0.887-0.024-1.38,1.07-0.742,1.702l9.999,9.9c0.394,0.39,1.031,0.376,1.429,0l9.991-9.892   C26.879,12.64,27,12.388,27,12.106z M15.984,20.591L8.418,13.1H23.55L15.984,20.591z');
		path2.setAttributeNS(null, 'fill', 'rgb(29, 161, 242)');
		g.appendChild(path2);
		inner.appendChild(svg);

		wrapper.addEventListener('click', (event) => {
			event.preventDefault();
			this.scrollToLastRead.start();
		});

		target.insertBefore(wrapper, other_button);
	}
}




class SettingsUI {
	constructor() {
		deb.debug('Settings::constructor'); //@debug
		this.awaitMenuListener = new AwaitSelectorMatchObserver(
			'nav a[href="/home"]',
			(element) => {
				console.log(['matching nav a[href="/home"]', element]);
			}
		);
	}
}


// Setup debug output with filter.
const deb = new Debug(/Settings|ScrollToLastRead|TwitterMarkLastRead::handleTweet|Tweet::isPromotedElement/);
//deb.enable(); //@debug
//const deb = new Debug(/TwitterMarkLastRead::/);

/*
 * We only want to load when the timeline is ordered on Following
 * But the "Following" header loads slowly. So await DOM changes.
 * TODO : change this
 */
let tmlr;
const await_selector_tmlr = new AwaitSelectorMatchObserver(
	'h2[role="heading"]',
	(element) => {
		if ([... document.querySelectorAll('h2')].filter((h) => {
			return h.textContent.indexOf('Following') >= 0;
		}).length > 0) {

			try {
				await_selector_tmlr.disconnect();
				tmlr = new TwitterMarkLastRead();
			} catch (e) {
				console.error('error', e);
			}
		}
	}
)
