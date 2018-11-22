const RecordHandler = require('./record_handler');
const RecordConstructor = handler => (value, options = {}) => {
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

module.exports = instance => ({
  set: function() {
    throw new Error('Records are read-only');
  },
  get: function (obj, prop) {
    if (prop === 'destroyed') {
      if (typeof obj.__$destroyed === 'boolean') {
        return obj.__$destroyed;
      }
      throw new Error('Should explicitly have state for `destroyed`');
    }
    
    if (prop === 'destroy') {
      return () => {
        const destroyed = obj.__$destroyed;

        if (destroyed) {
          throw new Error('Shouldn\'t destroy already destroyed records');
        }

        const { sql } = this.__generate_sql_batch_delete_expression(obj);
        this.__db_connection.prepare(sql).run();

        obj.__$destroyed = true;
        return true;
      }
    }

    if (prop === 'mutate') {
      return (mutation) => {
        const destroyed = obj.__$destroyed;

        if (destroyed) {
          throw new Error('Shouldn\'t mutate destroyed records');
        }

        const sqlUpdateObj = {};

        const mutateRecordProxy = new Proxy({}, {
          get: (_, prop) => {
            if (['id', 'created', 'updated'].includes(prop)) {
              throw new Error(`Cannot access column \`${prop}\` since it is a Records object instead of a single Record`);
            }

            if (this.__field_names.includes(prop)) {
              const type = this.__field_name_map_types[prop];
              return type.__output(sqlUpdateObj[prop]);
            }

            throw new Error(`No column \`${prop}\` exists`);
          },
          set: (_, prop, value) => {
            if (['id', 'created', 'updated'].includes(prop)) {
              throw new Error(`Shouldn\'t assign value to read-only field \`${prop}\``);
            }

            if (this.__field_names.includes(prop)) {
              const required = this.__field_name_map_required[prop];
              if (!required & value === null) {
                sqlUpdateObj[prop] = null;
                return true;
              }

              const type = this.__field_name_map_types[prop];
              if (type.validAssignment(value)) {
                sqlUpdateObj[prop] = type.assign(value);
              } else {
                throw new Error(`Wrong type format when assigning into column \`${prop}\` with type \`${type.name}\``);
              }
              return true;
            }

            throw new Error(`Shouldn\'t assign value to non-existed field \`${prop}\``)
          },
        });

        mutation(mutateRecordProxy);

        const { sql, timestamp } = this.__generate_sql_batch_update_expression(obj, sqlUpdateObj);
        this.__db_connection.prepare(sql).run();

        obj.forEach(record => {
          record.updated = timestamp;
          Object.assign(record, sqlUpdateObj);
        });
        return true;
      };
    }

    if (prop === 'mutateEach') {
      return (mutation) => {
        const destroyed = obj.__$destroyed;

        if (destroyed) {
          throw new Error('Shouldn\'t mutate destroyed records');
        }

        obj.forEach((record) => {
          const originalRecord = {};
          this.__field_names.forEach((name) => {
            Object.assign(originalRecord, { [name]: record[name] });
          });

          let mutated = false;
          const mutateRecordProxy = new Proxy(originalRecord, {
            get: (mutateAvailableObj, prop) => {
              if (['id', 'created', 'updated'].includes(prop)) {
                return record[prop];
              }
 
              if (this.__field_names.includes(prop)) {
                return mutateAvailableObj[prop];
              }
  
              throw new Error(`No column \`${prop}\` exists`);
            },
            set: (mutateAvailableObj, prop, value) => {
              if (['id', 'created', 'updated'].includes(prop)) {
                throw new Error(`Shouldn\'t assign value to read-only field \`${prop}\``);
              }
  
              if (this.__field_names.includes(prop)) {
                mutated = true;
                const required = this.__field_name_map_required[prop];
                if (!required & value === null) {
                  mutateAvailableObj[prop] = null;
                }
  
                const type = this.__field_name_map_types[prop];
                if (type.validAssignment(value)) {
                  mutateAvailableObj[prop] = type.assign(value);
                } else {
                  throw new Error(`Wrong type format when assigning into column \`${prop}\` with type \`${type.name}\``);
                }
                return true;
              }
  
              throw new Error(`Shouldn\'t assign value to non-existed field \`${prop}\``)
            },
          });
    
          mutation(mutateRecordProxy);

          this.__field_names.forEach((name) => {
            if (mutateRecordProxy[name] !== undefined) {
              record[name] = mutateRecordProxy[name];
            }
          });

          if (!mutated) return true;
  
          const { sql, timestamp } = this.__generate_sql_update_expression(record);
          this.__db_connection.prepare(sql).run();
  
          record.updated = timestamp;
          record.__$saved = true;
        });
        return true;
      };
    }

    /* Accessing Records with index will return wrapped Record object */
    if (/^\+?(0|[1-9]\d*)$/.test(prop)) {
      if (obj.__$destroyed) {
        return this.Record(obj[prop], { destroyed: true });
      }

      return this.Record(obj[prop]);
    }
    return obj[prop];
  }.bind(instance),
});
