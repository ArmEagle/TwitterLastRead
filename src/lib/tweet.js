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
