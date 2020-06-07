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