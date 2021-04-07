/**
 * Twitter IDs are pretty large. Big numbers aren't supported yet.
 * This class will convert integers to zero padded strings.
 * Comparison is then simply done as string comparison.
 */
class StringBigInt {
	/**
	 * @param {int} value
	 */
	constructor (value) {
		// Number of 'digits' to use so we can always do string comparison of tweet ids by prepending zeros.
		this.valueSize = 24;
		this.value = this.padZeros('' + value);
	}

	/**
	 * @param {int} val
	 */
	padZeros(val) {
		while (val.length < this.valueSize) {
			val = '0' + val;
		}
		return val;
	}

	/**
	 * @return {string}
	 */
	toJSON() {
		return this.valueOf();
	}

	/**
	 * @return {string}
	 */
	toString() {
		return this.valueOf();
	}

	/**
	 * @return {string}
	 */
	valueOf() {
		return this.value;
	}

	/**
	 * Compare with other value.
	 * @param {StringBigInt} other
	 * @return int From string comparison.
	 */
	compare(other) {
		deb.debug('StringBigInt::compare', this.toString(), other.toString(), this.toString().localeCompare(other.toString(), 'en'));
		return this.toString().localeCompare(other.toString(), 'en');
	}
}
