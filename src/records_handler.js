module.exports = instance => ({
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

    /* Accessing Records with index will return wrapped Record object */
    if (/^\+?(0|[1-9]\d*)$/.test(prop)) {
      return this.Record(obj[prop]);
    }
    return obj[prop];
  }.bind(instance),
});
