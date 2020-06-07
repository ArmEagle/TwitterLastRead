class Debug {
	/**
	 * @param {bool} Whether debug is logged at all.
	 * @param {RegExp} Debug string should match this regular expression to be logged.
	 */
	constructor(enabled, filter) {
		this.filter = filter;
		console.debug('Debug::constructor'); //@debug
		this.enabled = enabled;
	}

	/**
	 * @param {string} String to log.
	 * @param[] {mixed} More arguments to log.
	 */
	debug(string) {
		if (
			!this.filter
			|| this.enabled && string.match(this.filter)
		) {
			console.debug([...arguments]);
		}
	}
}