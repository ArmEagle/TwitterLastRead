/**
 * Class to handle all things about a tweet element.
 */
class Tweet {

	/**
	 * @param tmlr {TwitterMarkLastRead}
	 * @param element {HTMLElement} Root tweet element
	 */
	constructor(tmlr, element) {
		deb.debug('Tweet::constructor');

		this.tmlr = tmlr;
		this.element = element;

		this.key_tweet_markread_checked = 'data-tmlr-checked';
		this.tweet_handled_attribute = 'data-tmlr-handled';
		this.key_tweet_id = 'data-tmlr-tweet-id';
	
		this.state_read = 'data-tmlr-read';
		this.state_retweet = 'data-tmlr-retweet';
		this.state_like = 'data-tmlr-like'; // @todo // not shown anymore? setting?
		this.state_promoted = 'data-tmlr-promoted'; // @todo
	}

	init() {
		// Prevent double run on tweet element
		if (this.element.hasAttribute(this.tweet_handled_attribute)) {
			return;
		}
		this.element.setAttribute(this.tweet_handled_attribute, true);
	
		deb.debug('Tweet::init', this.element);
		this.addEventListeners();
	
		this.checkTweet(this.tmlr.getLastReadId());

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
//	if (this.isNormal()) {
		const popupHook = this.element.querySelector('[role="button"][aria-haspopup="true"][aria-label="More"]');
		if (!popupHook) {
			console.error('Could not find Tweet context menu dropdown hook.');
		} else {
			popupHook.addEventListener('click', (event) => {
				deb.debug('Tweet::popupHook', event, this.getId());
				this.tmlr.setPopupActiveTweet(this);
			});
		}
//	}
	
	deb.debug('Tweet::addEventListeners::end');
	}

	/**
	 * Check Tweet: for type and whether tweet should be marked as already read.
	 * @param lastReadId {BigInt|null}
	 */
	checkTweet(lastReadId) {
		deb.debug('Tweet::checkMarkRead', lastReadId, this.element);
	
		if (!lastReadId) {
			return;
		}

		if (this.checkAttribute(this.key_tweet_markread_checked)) {
			return;
		}

		if (this.isRetweet()) {
			deb.debug('Tweet::checkMarkRead-detail', 'is retweet');
			this.element.setAttribute(this.state_retweet, '');
		} else {
			const tweetId = this.getId();
			if (this.getId() <= lastReadId) {
				deb.debug('Tweet::checkMarkRead-detail', 'mark as read', this.getId(), '<=', lastReadId);
				this.element.setAttribute(this.state_read, '');
			} else {
				deb.debug('Tweet::checkMarkRead-detail', 'new tweet', this.getId(), '>', lastReadId);
			}
		}
	}
	
	/**
	 * @return {bool} Whether this is a retweet.
	 */
	isRetweet() {
		return this.element.hasAttribute(this.state_retweet);
	}
	
	/**
	 * @return {bool} Whether this is a liked tweet.
	 */
	isLike() {
		return this.element.hasAttribute(this.state_like);
	}
	
	/**
	 * @return {bool} Whether this is a promoted tweet.
	 */
	isPromoted() {
		return this.element.hasAttribute(this.state_promoted);
	}
	
	/**
	 * @return {bool} Whether this is a normal tweet.
	 */
	isNormal() {
		return !this.isRetweet() && !this.isLike() && !this.isPromoted();
	}

	/**
	 * Check whether an attribute is already set, and set it if it isn't yet.
	 * @param dataKey {string}
	 * @return {bool} Whether the attribute was already set.
	 */
 	checkAttribute(dataKey) {
		deb.debug('Tweet::checkAttribute');

		if (this.element.hasAttribute(dataKey)) {
			return true;
		}
		this.element.setAttribute(dataKey, true);

		return false;
	}

	/**
	 * @return {BigInt} Tweet id
	 * @throws When id not found
	 */
	getId() {
		deb.debug('Tweet::getId');

		if (this.id) {
			return this.id;
		}

		const time_link = this.element.querySelector('time').closest('a');
		if (!time_link) {
			throw 'Time element not found';
		}

		// Grab trailing long number
		const tweet_id_matches = time_link.getAttribute('href').match(/\d+$/);
		if (!tweet_id_matches || !tweet_id_matches.length) {
			throw 'Tweet id not found';
		}

		this.id = new BigInt(tweet_id_matches[0]);
		this.element.setAttribute(this.key_tweet_id, this.id.toString());

		return this.id;
	}

	/**
	 * @return {bool}
	 */
	isRetweet() {
		deb.debug('Tweet::isRetweet');

		// First `a span` can contain a span with the person retweeting and the text " Retweeted".
		const span = this.element.querySelector('a span');
		return span && span.textContent.indexOf(' Retweeted') > 0;
	}
}
/**
 * Class that waits for appearance of and handles an opened Tweet popup menu.
 */
class TweetMenu {
	
	constructor(tmlr) {
		this.tmlr = tmlr;
		this.tweetMenuWrapper = null;

		this.tweetmenu_handled_attribute = 'data-tmlr-handled';

		this.mutationSelector = '[role="menu"]';
		this.mutationRootSelector = '#react-root';
	
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
		const span = document.createElement('span');
		span.textContent = label;
		wrapper.appendChild(span);
		
		span.addEventListener('click', (event) => {
			event.preventDefault();
			deb.debug('TweetMenu::click', wrapper);
			callback(event);
		});
		
		this.menuContainer.appendChild(wrapper);
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
/**
 * Twitter IDs are pretty large. Big numbers aren't supported yet.
 * This class will convert integers to zero padded strings.
 * Comparison is then simply done as string comparison.
 */
class BigInt {
	/**
	 * @param {int} value 
	 */
	constructor (value) {
		// Number of 'digits' to use so we can always do string comparison of tweet ids by prepending zeros.
		this.valueSize = 24; 
		this.value = new String(value);
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
		return this.padZeros(this.value);
	}
}
class Debug {
	/**
	 * @param {bool} Whether debug is logged at all.
	 * @param {RegExp} Debug string should match this regular expression to be logged.
	 */
	constructor(enabled, filter) {
		this.filter = filter;
		console.debug('Debug::constructor'); //@debug
		this.enabled = enabled;
	}

	/**
	 * @param {string} String to log.
	 * @param[] {mixed} More arguments to log.
	 */
	debug(string) {
		if (
			!this.filter
			|| this.enabled && string.match(this.filter)
		) {
			console.debug([...arguments]);
		}
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
// ==UserScript==
// @name	Twitter - Mark Last Read
// @version 1
// @grant   none
// @include https://*twitter.com/*
// ==/UserScript==

/*
TODO:
- use AwaitSelectorMatchObserver for new Tweet elements
 */

console.log('start script');

class TwitterMarkLastRead {


	constructor() {
		deb.debug('TwitterMarkLastRead::constructor');

		if (!this.isChronologicalStream()) {
			console.log('TwitterMarkLastRead: Not loading because we have no chronological stream');
			return;
		}

		this.settings = new Settings('tmlr', {
			'lastread': false,
		});
		this.lastReadId = this.settings.get('lastread') || false;
		//new BigInt('1267924105090740227'); //'1162684552193724417'); //'1162675773683195905',); //'1162629769831358466');
		/* @var {Tweet} Tweet the popup menu was last opened for. */
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
		tweetElement.setAttribute('data-tmlr-debug', ''); //@debug

	// Not when in modal
	/*
	if (tweetElement.closest('[aria-modal]')) {
			deb.debug('TwitterMarkLastRead::handleTweet::isInModal', tweetElement);
	  return;
	}
	*/

		const tweet = new Tweet(this, tweetElement);
	tweet.init();
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
			[data-tmlr-read][data-tmlr-retweet] {
				border-left: 3px solid #7c98aa;
			}
			[data-tmlr-debug] {
				border-right: 3px solid #ff907c;
			}
	  [data-tmlr-menuitem] {
		color: white;
		padding: 15px;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
		font-size: 15px;
		cursor: pointer;
	  }
		`;

		document.body.appendChild(style);
	}

	/**
	 * Check whether the page is showing a chronological stream.
	 * @return {bool}
	 */
	isChronologicalStream() {
		// Home needs "Latest Tweets" set (in a h2).
		if (location.pathname === '/home') {
			return [... document.querySelectorAll('h2')].filter((h) => {
				return h.textContent.indexOf('Latest Tweets') >= 0;
			}).length > 0;
		}

		// Or Search on "Latest"
		if (location.pathname.indexOf('/search') === 0) {
			return location.search.indexOf('f=live') > 0;
		}

		return false;
	}

	/**
	 * @return {BigInt} The last read Tweet id.
	 */
	getLastReadId() {
		// @todo
		return this.lastReadId;
	}

	/**
	 * @param tweetId {BigInt} The last read Tweet id.
	 */
	setLastReadId(tweetId) {
		// @todo
		deb.debug('TwitterMarkLastRead::setLastReadId', '' + tweetId);
		this.lastReadId = '' + tweetId;
		this.settings.set('lastread', this.lastReadId);
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



const deb = new Debug(true, /Settings|Tweet::popupHook|setLastReadId/);

// "Latest Tweets" header loads slowly.
// TODO : change this
let tmlr;
const await_selector_tmlr = new AwaitSelectorMatchObserver(
	'h2[role="heading"]',
	(element) => {
		if ([... document.querySelectorAll('h2')].filter((h) => {
					return h.textContent.indexOf('Latest Tweets') >= 0;
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


console.log('end scr test');
