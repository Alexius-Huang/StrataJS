module.exports = class Query {
  constructor(params) {
    this.__whereExpr = [];
    this.__limit = -1;
    this.__limitBeginning = true;

    this.__fields = params.__fields;
    this.__table_name = params.__table_name;
    this.__db_connection = params.__db_connection;
    this.Records = params.Records;

    this.__field_names = this.__fields
      .map(({ name }) => name)
      .concat(['created', 'updated', 'id']);
    this.__field_name_map_types = Object.assign(
      this.__fields.reduce(
        (acc, { name, type }) => Object.assign(acc, { [name]: type }), {}
      ),
      { created: 'timestamp', updated: 'timestamp', id: 'integer' }
    );

    this.__base_sql = `SELECT * FROM ${this.__table_name}`;
  }

  parse() {
    let sql;

    if (this.__whereExpr.length) {
      sql = ` WHERE ${this.__whereExpr.join(' OR ')}`;
    }
    if (this.__limit > 0) {
      if (this.__limitBeginning) {
        sql += ` LIMIT ${this.__limit}`;
      } else {
        sql += ` ORDER BY id DESC LIMIT ${this.__limit}`;
      }
    }

    return sql;
  }

  where(options) {
    const fields = Object.keys(options);
    const exprs = [];

    for (let i = 0; i < fields.length; i += 1) {
      const fieldName = fields[i];
      if (this.__field_names.includes(fieldName)) {
        const type = this.__field_name_map_types[fieldName];
        const value = options[fields[i]];

        /* Comparison */
        if (typeof value === 'object') {
          if (type.comparable) {
            const operators = Object.keys(value);
            operators.forEach((op) => {
              if (op === 'gt') {
                exprs.push(`${fieldName} > ${value.gt}`);
              } else if (op === 'lt') {
                exprs.push(`${fieldName} < ${value.lt}`);
              } else if (op === 'gte') {
                exprs.push(`${fieldName} >= ${value.gte}`);
              } else if (op === 'lte') {
                exprs.push(`${fieldName} <= ${value.lte}`);
              } else if (op === 'ne') {
                exprs.push(`${fieldName} != ${value.ne}`);
              }  
            });
          } else {
            throw new Error(`Type \`${type.name}\` is uncomparable in Where expression`);
          }
        }
        
        /* Equality Comparison */
        else if (type.stringFormat) {
          exprs.push(`${fieldName} = '${value}'`);
        } else {
          exprs.push(`${fieldName} = ${value}`);
        }
      } else {
        throw new Error(`Field name \`${fieldName}\` not exist`);
      }
    }

    const expr = exprs.join(' AND ');

    this.__whereExpr.push(expr);
    return this;
  }

  clear() {
    this.__whereExpr = [];
    this.__limit = -1;
    this.__limitBeginning = true;
    return this;
  }

  limit(value) {
    if (!value) throw new Error(`Should specify value in limit expression`);
    this.__limitBeginning = true;
    this.__limit = value;
    return this;
  }

  first(value = 1) {
    this.__limitBeginning = true;
    this.__limit = value;
    return this;
  }

  last(value = 1) {
    this.__limitBeginning = false;
    this.__limit = value;
    return this;
  }

  evaluate() {
    const results = this.__db_connection.prepare(`${this.__base_sql} ${this.parse()}`).all();
    if (this.__limitBeginning) {
      return this.Records(results);
    } else {
      return this.Records(results.reverse());    
    }
  }
}
