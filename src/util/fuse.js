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
