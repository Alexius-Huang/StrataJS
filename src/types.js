module.exports = {
  INTEGER: 'integer',
  STRING: 'string',
  BOOLEAN: 'boolean',

  VARCHAR(value) { return ['varchar', value] },
  TEXT: 'text',
};
