const config = require('./config');
// const Records = require('./records');
const Database = require('better-sqlite3');
const _ = require('./helpers');
const pluralize = require('pluralize');

module.exports = class Model {
  constructor({ tableName, fields }) {
    this.__db_connection = new Database(config.DB_FILE);
    this.__table_name = tableName;
    this.__capitialized_table_name = tableName.replace(/^\w/, c => c.toUpperCase());
    this.__records_name = `${this.__capitialized_table_name}Records`;
    this.__record_name = `${this.__capitialized_table_name}Record`;
    this.__fields = fields;

    this.__build_table_if_not_exist();

    this.__generate_sql_insert_expression = () => '';
    this.__define_sql_expression_methods();

    /* Records Class for array kind structure */
    // global[this.__records_name] = class extends Records {};
    // this.Records = global[this.__records_name];

    const fieldNames = fields.map(({ name }) => name);
    global[this.__record_name] = class {
      constructor(obj) {
        this.id = obj.id;
        this.created = obj.created;
        this.updated = obj.updated;
        fieldNames.forEach((name) => {
          this[name] = obj[name];
        });
      }
    };
    this.Record = global[this.__record_name];

    process.on('exit', () => this.__db_connection.close());
    process.on('SIGINT', () => this.__db_connection.close());
    process.on('SIGHUP', () => this.__db_connection.close());
    process.on('SIGTERM', () => this.__db_connection.close());
  }

  hasMany(model, options) {
    const Record = global[this.__record_name];
    const name = model.__table_name;
    const { foreignKey } = options;

    Record.prototype[name] = function() {
      const { id } = this;
      return model.where({ [foreignKey]: id });
    };
  }

  belongsTo(model, options) {
    const Record = global[this.__record_name];
    const name = pluralize.singular(model.__table_name);
    const { foreignKey } = options;

    Record.prototype[name] = function() {
      const { [foreignKey]: id } = this;
      return model.find(id);
    }
  }

  execute(expression) {
    this.__db_connection.exec(expression);
    // console.log(`PROCESS: ${expression}`);
  }

  __define_sql_expression_methods() {
    const fields = this.__fields.map(({ name }) => name);
    const sqlColumns = fields.join(', ');
    const now = Date.now();

    this.__generate_sql_insert_expression = (obj) => `
INSERT INTO ${this.__table_name} (${sqlColumns}, created, updated)
VALUES (${
  this.__fields
    .map(({ name, type }) => _.mapValues(type, obj[name]))
    .join(', ')
}, ${now}, ${now})
    `;
  }

  __build_table_if_not_exist() {
    const sqlColumns = this.__fields.map((field) => {
      // TODO: Implement Default option
      const { name, type, required, unique /* default: d */ } = field;
      const sqlType = _.mapTypes(type);
      const sqlRequired = required ? ' NOT NULL' : '';
      const sqlUnique = unique ? ' UNIQUE' : '';
      const sqlDefault = '';

      return `${name} ${sqlType}${sqlRequired}${sqlUnique}${sqlDefault}`
    });

    const sql = `
CREATE TABLE IF NOT EXISTS ${this.__table_name} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ${sqlColumns.join(',\n  ')},
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
    `;

    this.execute(sql);
  }

  create(obj) {
    const sql = this.__generate_sql_insert_expression(obj);
    this.execute(sql);
  }

  all() {
    return this.__db_connection.prepare(`SELECT * from ${this.__table_name}`).all();
  }

  /* TODO: Implement more detail */
  where(options) {
    const fields = Object.keys(options);
    const value = options[fields[0]];
    return this.__db_connection.prepare(`SELECT * from ${this.__table_name} WHERE ${fields[0]} = ?`).all(value);
  }

  find(id) {
    return new this.Record(
      this.__db_connection.prepare(`SELECT * from ${this.__table_name} WHERE id = ?`, id).get(id)
    );
  }
}
