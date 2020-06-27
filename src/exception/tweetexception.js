class TweetException extends Error {
	constructor(message, details) {
		this.details = details;

		Error(message);
	}
}
