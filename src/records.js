module.exports = class Records {
  constructor(records) {
    this.values = records;
  }

  limit(count = 1) {
    return new this.constructor(
      this.values.slice(0, count)
    );
  }

  sort(args) {
    return new this.constructor(
      this.values.sort(args)
    );
  }
}
