const Database = require('better-sqlite3');
const pluralize = require('pluralize');
const config = require('./config');
const Query = require('./query');
// const Types = require('./types');
const _ = require('./helpers');

const RecordConstructor = handler => value => new Proxy(value, handler);
const RecordsConstructor = handler => value => new Proxy(value, handler);

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
    this.__fields = fields;

    this.__build_table_if_not_exist();

    this.__generate_sql_insert_expression = () => '';
    this.__define_sql_expression_methods();

    this.__has_many = [];
    this.__belongs_to = [];

    this.Record = RecordConstructor({
      get: (obj, prop) => {
        for (let i = 0; i < this.__has_many.length; i += 1) {
          const { name, foreignKey, model } = this.__has_many[i];
          if (name === prop) {
            const { id } = obj;
            return model.where({ [foreignKey]: id });
          }
        }

        for (let i = 0; i < this.__belongs_to.length; i += 1) {
          const { name, foreignKey, model } = this.__belongs_to[i];
          if (name === prop) {
            const id = obj[foreignKey];
            return model.find(id);
          }
        }

        return obj[prop];
      },
    });

    this.__records_handler = {
      get: (obj, prop) => {
        if (/^\+?(0|[1-9]\d*)$/.test(prop)) {
          return this.Record(obj[prop]);
        }
        return obj[prop];
      },
    };
    this.Records = RecordsConstructor(this.__records_handler);

    process.on('exit', () => this.__db_connection.close());
    process.on('SIGINT', () => this.__db_connection.close());
    process.on('SIGHUP', () => this.__db_connection.close());
    process.on('SIGTERM', () => this.__db_connection.close());
  }

  hasMany(model, options) {
    const name = model.__table_name;
    const { foreignKey } = options;
    this.__has_many.push({ name, foreignKey, model });
  }

  belongsTo(model, options) {
    const name = pluralize.singular(model.__table_name);
    const { foreignKey } = options;
    this.__belongs_to.push({ name, foreignKey, model });
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
      __fields,
      __records_handler,
    } = this;
    const query = mutation(new Query({
      __db_connection,
      __table_name,
      __fields,
      Records: RecordsConstructor(__records_handler),
    }));

    return query;
  }

  create(obj) {
    const sql = this.__generate_sql_insert_expression(obj);
    this.execute(sql);
  }

  all() {
    const sql = `SELECT * FROM ${this.__table_name}`;
    return this.Records(this.__db_connection.prepare(sql).all());
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
    const sql = `SELECT * FROM ${this.__table_name} WHERE id = ?`;
    return this.Record(this.__db_connection.prepare(sql, id).get(id));
  }
}
