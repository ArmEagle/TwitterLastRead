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
