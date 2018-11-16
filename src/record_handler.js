/* Generates handler for records */
module.exports = instance => ({
  get: function (obj, prop) {
    if (prop === 'saved') {
      if (typeof obj.__$saved === 'boolean') {
        return obj.__$saved;
      }
      throw new Error(`Should explicitly have state for \`saved\``);
    }

    if (prop === 'persisted') {
      if (typeof obj.__$new === 'boolean') {
        return !obj.__$new;
      }
      throw new Error(`Should explicitly have state for \`persisted\``)
    }

    const isValid = (() => {
      for (let i = 0; i < this.__field_names.length; i += 1) {
        const name = this.__field_names[i];
        const type = this.__field_name_map_types[name];
        const required = this.__field_name_map_required[name];
        const value = obj[name];

        /* Skip validation if value is specifically null and not required */
        if (!required && value === null) continue;

        if (required && value === null) return false;
        if (!type.validSQLInput(value)) return false;
      }

      return true;
    })();

    if (prop === 'valid') return isValid;

    if (prop === 'save') {
      return () => {
        const isNewInstance = obj.__$new;

        if (!isValid) throw new Error('Record format isn\'t correct');

        if (isNewInstance) {
          const { sql, timestamp } = this.__generate_sql_insert_expression(obj);
          const { lastInsertRowid: id } = this.__db_connection.prepare(sql).run();

          obj.id = id;
          obj.created = timestamp;
          obj.updated = timestamp;
          obj.__$saved = true;
          obj.__$new = false;
          return true;
        } else {
          const { sql, timestamp } = this.__generate_sql_update_expression(obj);
          this.__db_connection.prepare(sql).run();

          obj.updated = timestamp;
          obj.__$saved = true;
          return true;
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
      return type.output(obj[prop]);
    }

    return obj[prop];
  }.bind(instance),

  set: function (obj, prop, value) {
    if (this.__field_names.includes(prop)) {
      obj.__$saved = false;

      const type = this.__field_name_map_types[prop];

      obj[prop] = type.assign(value);
      return true;
    }

    throw new Error(`Cannot set value in unknown field \`${prop}\``);
  }.bind(instance),
});
