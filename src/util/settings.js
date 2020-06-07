/**
 * Persistent storage using LocalJsonStorage class.
 */
class Settings {
	/**
	 * @param {string} key
	 * @param {*} defaultConfig
	 */
	constructor(key, defaultConfig) {
		this.storage = new LocalJsonStorage(key);
		if (!this.storage.get()) {
			this.storage.set(defaultConfig);
		}
	}

	/**
	 * Retrieve a value.
	 * @param {string} key
	 * @return {*}
	 */
	get(key) {
		const settings = this.storage.get();
		return settings[key];
	}

	/**
	 * Store a value.
	 * @param {string} key
	 * @param {*} data
	 */
	set(key, data) {
		const settings = this.storage.get();
		settings[key] = data;
		this.storage.set(settings);
	}
}
