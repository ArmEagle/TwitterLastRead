class Debug {
	/**
	 * @param {RegExp} Debug string should match this regular expression to be logged.
	 */
	constructor(filter) {
		this.filter = filter;
		this.enabled = false;
		this.debug('Debug::constructor'); //@debug
	}

	/**
	 * @param {string} String to log.
	 * @param[] {mixed} More arguments to log.
	 */
	debug(string) {
		if (
			!this.filter
			|| this.isEnabled() && string.match(this.filter)
		) {
			console.debug([...arguments]);
		}
	}

	/**
	 * Disable debug output.
	 */
	disable() {
		this.enabled = false;
	}

	/**
	 * Enable debug output;
	 */
	enable() {
		this.enabled = true;
	}

	/**
	 * @return bool Whether debugging is enabled.
	 */
	isEnabled() {
		return this.enabled;
	}
}
