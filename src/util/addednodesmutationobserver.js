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
						// Catch exceptions here since we're in a callback outside of the normal execution loop.
						try {
							mutation.addedNodes.forEach((element) => {
								this.callback(element);
							});
						} catch (exception) {
							exception instanceof TweetException
								? console.error(exception.getDetails(), exception)
								: console.error(exception)
						}
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
