class TweetException extends Error {
	constructor(message, details) {
		super(message);

		this.name = this.constructor.name;
		this.details = details;
	}

	/**
	 * Return the passed details.
	 * @returns object|null
	 */
	getDetails() {
		return this.details;
	}
}
