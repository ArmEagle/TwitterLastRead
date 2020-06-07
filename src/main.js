// ==UserScript==
// @name	Twitter - Mark Last Read
// @version 1
// @grant   none
// @include https://*twitter.com/*
// ==/UserScript==

/*
TODO:
- Use AwaitSelectorMatchObserver for new Tweet elements
- Update marked tweets when setting last read tweet.
- Store last marked read tweet based on url. This to support lists.
   - Script doesn't load on Notifications yet.
- Build fix: so that this userscript header bit is also at the top of script.user.js.
- Check all variable names and decide whether I want snake_case or camelcase.
- Check all function doc and put variable name after type definition (now it is nicely highlighted in VSCode).
- Separate styling / add to settings?
 */

console.log('start script');

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

		this.settings = new Settings('tmlr', {
			'lastread': false,
		});
		this.lastReadId = this.settings.get('lastread') || false;
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


// Setup debug output with filter.
const deb = new Debug(true, /Settings|Tweet::popupHook|setLastReadId/);

/*
 * We only want to load when the timeline is ordered on latest tweets
 * But the "Latest Tweets" header loads slowly. So await DOM changes.
 * TODO : change this
 */
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
