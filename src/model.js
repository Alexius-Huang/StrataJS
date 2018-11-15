const Database = require('better-sqlite3');
const pluralize = require('pluralize');
const config = require('./config');
const Records = require('./records');
const Query = require('./query');
// const Types = require('./types');
const _ = require('./helpers');

module.exports = class Model {
  /*
   *  Type fields :: [
   *    {
   *      name:String
   *      type:String
   *      required:Boolean
   *      default:Any
   *      unique:Boolean
   *    }
   *  ]
   */

  constructor({ tableName, fields }) {
    this.__db_connection = new Database(config.DB_FILE);
    this.__table_name = tableName;
    this.__capitialized_table_name = tableName.replace(/^\w/, c => c.toUpperCase());
    this.__records_name = `${this.__capitialized_table_name}Records`;
    this.__record_name = `${this.__capitialized_table_name}Record`;
    this.__fields = fields;

    this.__field_names = fields
      .map(({ name }) => name)
      .concat(['created', 'updated', 'id']);
    this.__field_name_map_types = Object.assign(
      fields.reduce(
        (acc, { name, type }) => Object.assign(acc, { [name]: type }), {}
      ),
      { created: 'timestamp', updated: 'timestamp', id: 'integer' }
    );

    this.__build_table_if_not_exist();

    this.__generate_sql_insert_expression = () => '';
    this.__define_sql_expression_methods();

    /* Records Class for array kind structure */
    global[this.__records_name] = class extends Records {};
    this.Records = global[this.__records_name];

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

  __return_query_object(mutation) {
    const {
      __db_connection,
      __table_name,
      __field_name_map_types,
      __field_names,
      Records
    } = this;
    const query = mutation(new Query({
      __db_connection,
      __table_name,
      __field_name_map_types,
      __field_names,
      Records,
    }));

    return query;
  }

  create(obj) {
    const sql = this.__generate_sql_insert_expression(obj);
    this.execute(sql);
  }

  all() {
    return new this.Records(
      this.__db_connection.prepare(`SELECT * FROM ${this.__table_name}`).all()
    );
  }

  first(counts) {
    return this.__return_query_object((q) => {
      q.first(counts);
      return q;
    });
  }

  limit(counts) {
    return this.__return_query_object((q) => {
      q.limit(counts);
      return q;
    });
  }

  last(counts) {
    return this.__return_query_object((q) => {
      q.last(counts);
      return q;
    });
  }

  where(options) {
    return this.__return_query_object((q) => {
      q.where(options);
      return q;
    });
  }

  find(id) {
    return new this.Record(
      this.__db_connection.prepare(`SELECT * FROM ${this.__table_name} WHERE id = ?`, id).get(id)
    );
  }
}
