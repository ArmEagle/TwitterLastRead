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
