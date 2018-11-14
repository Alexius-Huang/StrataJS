module.exports = {
  mapTypes(type) {
    switch(type) {
      case 'integer': return 'INTEGER';
      case 'string': return 'VARCHAR(255)';
      case 'boolean': return 'BOOLEAN';
      default:
        throw new Error(`No SQL type mapped to: ${type}`);
    }
  },
  mapValues(type, value) {
    switch(type) {
      case 'integer': return `${value}`;
      case 'string': return `'${value}'`;
      case 'boolean': return value ? 1 : 0;
      default:
        throw new Error(`No SQL type mapped to: ${type}`);
    }
  },
}