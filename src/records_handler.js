module.exports = instance => ({
  get: function (obj, prop) {
    /* Accessing Records with index will return wrapped Record object */
    if (/^\+?(0|[1-9]\d*)$/.test(prop)) {
      return this.Record(obj[prop]);
    }
    return obj[prop];
  }.bind(instance),
})