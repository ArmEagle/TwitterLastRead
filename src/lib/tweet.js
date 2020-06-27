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

		this.key_tweet_markread_checked = 'data-tmlr-checked';
		this.tweet_handled_attribute = 'data-tmlr-handled';
		this.key_tweet_id = 'data-tmlr-tweet-id';

		this.state_read = 'data-tmlr-read';
		this.state_retweet = 'data-tmlr-retweet';
		this.state_like = 'data-tmlr-like'; // @todo // not shown anymore? setting?
		this.state_promoted = 'data-tmlr-promoted'; // @todo
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
			const popupHook = this.element.querySelector('[role="button"][aria-haspopup="true"][aria-label="More"]');
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
		}

		deb.debug('Tweet::addEventListeners::end');
	}

	/**
	 * Check Tweet: for type and whether tweet should be marked as already read.
	 * @param {BigInt|null} lastReadId
	 * @param {boolean} force If set, ignore the attribute that marks already being checked.
	 */
	checkTweet(lastReadId, force) {
		deb.debug('Tweet::checkMarkRead', lastReadId, this.element);

		if (!lastReadId) {
			return;
		}

		if (!force && this.checkAttribute(this.key_tweet_markread_checked)) {
			return;
		}

		if (this.isRetweetElement()) {
			deb.debug('Tweet::checkMarkRead-detail', 'is retweet');
			this.element.setAttribute(this.state_retweet, '');
		} else {
			const tweetId = this.getId();
			if (this.getId() <= lastReadId) {
				deb.debug('Tweet::checkMarkRead-detail', 'mark as read', this.getId(), '<=', lastReadId);
				this.element.setAttribute(this.state_read, '');
			} else {
				deb.debug('Tweet::checkMarkRead-detail', 'new tweet', this.getId(), '>', lastReadId);
				this.element.removeAttribute(this.state_read);
			}
		}
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
	 * @param {string} dataKey
	 * @return {boolean} Whether the attribute was already set.
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

		this.id = new BigInt(tweet_id_matches[0]);
		this.element.setAttribute(this.key_tweet_id, this.id.toString());

		return this.id;
	}

	/**
	 * @return {String} Id converted to String.
	 */
	getStringId() {
		return this.getId().toString();
	}

	/**
	 * @return {boolean}
	 */
	isRetweetElement() {
		deb.debug('Tweet::isRetweet');

		// First `a span` can contain a span with the person retweeting and the text " Retweeted".
		const span = this.element.querySelector('a span');
		return span && span.textContent.indexOf(' Retweeted') > 0;
	}

	/**
	 * Whether this Tweet still has an element.
	 * @return {boolean}
	 */
	hasElement() {
		return !!this.element;
	}
}
