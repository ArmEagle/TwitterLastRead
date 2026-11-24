/**
 * This class awaits for an element matching a selector to appear before calling a callback.
 */
class AwaitSelectorMatchObserver {
	/**
	 * @param selector {string} for element to wait for.
	 * @param callback {Function} Callback to call with selector element. Receives this observer as second argument,
	 *   so the callback can call `disconnect()` on it, also when it is called synchronously from this constructor.
	 * @param rootSelector {string} (optional) Selector for root node to listen on. Defaults to document.body.
	 */
	constructor(selector, callback, rootSelector) {
		deb.debug('AwaitSelectorMatchObserver::constructor');

		this.selector = selector;
		this.callback = callback;
		this.disconnected = false;

		if (typeof rootSelector === 'undefined') {
			rootSelector = 'body';
		}

		// Maybe it exists already.
		const rootNode = document.querySelector(rootSelector);
		if (rootNode) {
			this.nodeAddedHandler(rootNode);
		}

		// The callback may have disconnected us already.
		if (this.disconnected) {
			return;
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

        if (addedElement.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

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
		if (this.disconnected) {
			return;
		}

		deb.debug('AwaitSelectorMatchObserver::callbackWrapper', element);
		this.callback(element, this);
	}

	/**
	 * Stop observing.
	 */
	disconnect() {
		this.disconnected = true;
		if (typeof this.addedNodesMutationObserver !== 'undefined') {
			this.addedNodesMutationObserver.disconnect();
		}
	}
}
