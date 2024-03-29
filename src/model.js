const Database = require('better-sqlite3');
const pluralize = require('pluralize');
const config = require('./config');
const RecordHandler = require('./record_handler');
const RecordsHandler = require('./records_handler');
const Query = require('./query');
const { Types } = require('./types');

const RecordConstructor = handler => function (value, options = {}) {
  const decorate = {
    __$saved: false,
    __$new: false,
    __$destroyed: false,
  };
  if (options.saved)     { decorate.__$saved     = true; }
  if (options.new)       { decorate.__$new       = true; }
  if (options.destroyed) { decorate.__$destroyed = true; }

  return new Proxy(Object.assign(value, decorate), handler);
};
const RecordsConstructor = handler => (value, options = {}) => {
  const decorate = {
    __$destroyed: false,
  };
  if (options.destroyed) { decorate.__$destroyed = true; }

  return new Proxy(Object.assign(value, decorate), handler);
};

module.exports = class Model {
  /*
   *  Type fields :: [
   *    {
   *      name:String
   *      type:Strata.Type
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
    this.__field_names = fields.map(({ name }) => name);
    this.__field_name_map_types = fields.reduce(
      (acc, { name, type }) => Object.assign(acc, { [name]: type }), {}
    );
    this.__field_name_map_required = fields.reduce(
      (acc, { name, required }) => Object.assign(acc, {
        [name]: typeof required === 'boolean' ? required : false,
      }),
      {}
    );

    this.__conventional_fields = [
      { name: 'id', type: Types.Integer },
      { name: 'created', type: Types.Timestamp },
      { name: 'updated', type: Types.Timestamp },
    ];

    this.__conventional_field_names = this.__conventional_fields.map(({ name }) => name);
    this.__conventional_field_name_map_types = this.__conventional_fields.reduce(
      (acc, { name, type }) => Object.assign(acc, { [name]: type }), {}
    );

    this.__build_table_if_not_exist();

    this.__generate_sql_insert_expression = () => '';
    this.__generate_sql_update_expression = () => '';
    this.__generate_sql_delete_expression = () => '';
    this.__generate_sql_batch_delete_expression = () => '';
    this.__define_sql_expression_methods();

    this.__has_many = [];
    this.__belongs_to = [];

    this.Record = RecordConstructor(RecordHandler(this));
    this.Records = RecordsConstructor(RecordsHandler(this));

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

  new() {
    const record = {};
    this.__field_names.forEach(name => {
      Object.assign(record, { [name]: null });
    });

    Object.assign(record, {
      id: null,
      created: null,
      updated: null,
    });

    return this.Record(record, { saved: false, new: true });
  }

  __define_sql_expression_methods() {
    const sqlColumns = this.__field_names.join(', ');

    this.__generate_sql_insert_expression = (obj) => {
      const now = Date.now();
      const sqlInsertExprs = this.__fields
        .map(({ name, type }) => type.__parseSQL(obj[name]));

      return {
        timestamp: now,
        sql: `
INSERT INTO ${this.__table_name} (${sqlColumns}, created, updated)
VALUES (${sqlInsertExprs.join(', ')}, ${now}, ${now})`,
      };
    };

    this.__generate_sql_update_expression = (obj) => {
      const now = Date.now();

      const sqlUpdateExprs = this.__fields
        .map(({ name, type }) => `${name} = ${type.__parseSQL(obj[name])}`);
      sqlUpdateExprs.push(`updated = ${now}`);

      return {
        timestamp: now,
        sql: `
UPDATE ${this.__table_name}
SET ${sqlUpdateExprs.join(', ')}
WHERE id = ${obj.id}`,
      };
    };

    this.__generate_sql_batch_update_expression = (records, mutation) => {
      const now = Date.now();
      const ids = records.map(({ id }) => id);

      const sqlUpdateExprs = Object.keys(mutation).map((name) => {
        const type = this.__field_name_map_types[name];
        return `${name} = ${type.__parseSQL(mutation[name])}`
      });
      sqlUpdateExprs.push(`updated = ${now}`);

      return {
        timestamp: now,
        sql: `
UPDATE ${this.__table_name}
SET ${sqlUpdateExprs.join(', ')}
WHERE id IN (${ids.join(', ')})`,
      }
    };

    this.__generate_sql_delete_expression = (obj) => {
      const now = Date.now();

      return {
        timestamp: now,
        sql: `
DELETE FROM ${this.__table_name}
WHERE id = ${obj.id}`,
      };
    }

    this.__generate_sql_batch_delete_expression = (records) => {
      const now = Date.now();
      const ids = records.map(({ id }) => id);

      return {
        timestamp: now,
        sql: `
DELETE FROM ${this.__table_name}
WHERE id IN (${ids.join(', ')})`,
      };
    };
  }

  __build_table_if_not_exist() {
    const sqlColumns = this.__fields.map((field) => {
      // TODO: Implement Default option
      const { name, type, required, unique /* default: d */ } = field;
      const { sqlType } = type;
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
      Records,
    } = this;
    const query = mutation(new Query({
      __db_connection,
      __table_name,
      __fields,
      Records,
    }));

    return query;
  }

  create(obj) {
    const newRecord = this.new();
    Object.keys(obj).forEach((key) => {
      newRecord[key] = obj[key];
    });

    newRecord.save();
    return newRecord;
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
    const result = this.__db_connection.prepare(sql, id).get(id);

    if (result) {
      return this.Record(result, { saved: true });
    }
    return null;
  }
}
