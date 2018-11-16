const Types = require('./types');

/* Generates handler for records */
module.exports = instance => ({
  get: function (obj, prop) {
    if (prop === 'saved') {
      if (typeof obj.__$saved === 'boolean') {
        return obj.__$saved;
      }
      return true;
    }

    if (prop === 'valid') {
      for (let i = 0; i < this.__field_names.length; i += 1) {
        const name = this.__field_names[i];
        const type = this.__field_name_map_types[name];
        const required = this.__field_name_map_required[name];
        const value = obj[name]

        const shouldRequired = required && value === null;
        const checkNumber = (
          [Types.INTEGER, Types.TIMESTAMP].includes(type) &&
          typeof value !== 'number'
        );

        const checkBoolean = (
          type === Types.BOOLEAN &&
          (value !== 0 && value !== 1)
        );

        const checkString = (
          [Types.STRING, Types.TEXT].includes(type) &&
          typeof value !== 'string'
        );

        const incorrectType = checkNumber || checkBoolean || checkString;

        if (shouldRequired || incorrectType) {
          return false;
        }
      }

      return true;
    }

    if (prop === 'save') {
      return () => {
        const isNewInstance = obj.__$new;

        if (isNewInstance) {
          const { sql, timestamp } = this.__generate_sql_insert_expression(obj);
          const { lastInsertRowid: id } = this.__db_connection.prepare(sql).run();

          obj.id = id;
          obj.created = timestamp;
          obj.updated = timestamp;
          obj.__$saved = true;

          return this;
        } else {
          // const exprs = this.__generate_sql_update_expression(obj);
        }
      };
    }

    /* Parse Has-Many Relationships */
    for (let i = 0; i < this.__has_many.length; i += 1) {
      const { name, foreignKey, model } = this.__has_many[i];
      if (name === prop) {
        const { id } = obj;
        return model.where({ [foreignKey]: id });
      }
    }

    /* Parse Belongs-To Relationships */
    for (let i = 0; i < this.__belongs_to.length; i += 1) {
      const { name, foreignKey, model } = this.__belongs_to[i];
      if (name === prop) {
        const id = obj[foreignKey];
        return model.find(id);
      }
    }

    /* Parse Correct Value According to Types */
    if (this.__field_names.includes(prop)) {
      const type = this.__field_name_map_types[prop];

      /* Output Boolean should output as true or false */
      if (type === Types.BOOLEAN) {
        return obj[prop] === 1 ? true : false;
      }
    }

    return obj[prop];
  }.bind(instance),

  set: function (obj, prop, value) {
    if (this.__field_names.includes(prop)) {
      obj.__$saved = false;

      const type = this.__field_name_map_types[prop];

      if ([Types.INTEGER, Types.TIMESTAMP].includes(type)) {
        if (typeof value === 'number' && /^\+?(0|[1-9]\d*)$/.test(String(value))) {
          obj[prop] = value;
        } else {
          throw new Error(`${type} type should be assigned in number format`);
        }
      }
      
      /* Assign Boolean should store as 0 or 1 */
      else if (type === Types.BOOLEAN) {
        if (typeof value === 'boolean') {
          obj[prop] = value ? 1 : 0;
        } else if (value === 1 || value === 0) {
          obj[prop] = value;
        } else {
          throw new Error('boolean type should be assigned `true`/`false` or `1`/`0`');
        }
      }

      else {
        if (typeof value === 'string') {
          obj[prop] = value;
        } else {
          throw new Error(`${type} type should be assigned in string format`);
        }
      }

      return true;
    }

    throw new Error(`Cannot set value in unknown field \`${prop}\``);
  }.bind(instance),
});
