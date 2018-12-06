class Type {
  constructor(params) {
    this.name = params.name;
    this.sqlType = params.sqlType;
    this.stringFormat = typeof params.stringFormat === 'boolean' ? params.stringFormat : true;
    this.comparable = typeof params.comparable === 'boolean' ? params.comparable : false;

    this.nullishValue = params.nullishValue !== undefined ? params.nullishValue : null;
  }

  /* Private Fields */
  __parseSQL(value) {
    if (value === null) return 'NULL';

    if (this.stringFormat) {
      return `'${value}'`;
    }
    return value;
  }

  __output(input, meta) {
    const { nullishValue: n } = this;
    return input === n ? n : this.output(input, meta);
  }

  validAssignment(value) {
    return typeof value === 'string';
  }

  validSQLInput(value) {
    return typeof value === 'string'; 
  }

  output(input) {
    return String(input);
  }

  assign(value) {
    return value;
  }
}

class INTEGER extends Type {
  constructor() {
    super({
      name: 'integer',
      sqlType: 'integer',
      stringFormat: false,
      comparable: true,
    });
  }

  validAssignment(input) {
    return typeof input === 'number' && /^\+?(0|[1-9]\d*)$/.test(String(input));
  }
  validSQLInput(input) {
    return typeof input === 'number' && /^\+?(0|[1-9]\d*)$/.test(String(input));
  }

  output(input) {
    return Number(input);
  }
}

class STRING extends Type {
  constructor() {
    super({ name: 'string', sqlType: 'varchar(255)' });
  }
}

class TEXT extends Type {
  constructor() {
    super({ name: 'text', sqlType: 'text' });
  }
}

class TIMESTAMP extends Type {
  constructor() {
    super({
      name: 'timestamp',
      sqlType: 'integer',
      stringFormat: false,
      comparable: true,
    });
  }

  validAssignment(input) {
    return typeof input === 'number' && /^\+?(0|[1-9]\d*)$/.test(String(input));
  }

  validSQLInput(input) {
    return typeof input === 'number' && /^\+?(0|[1-9]\d*)$/.test(String(input));
  }

  output(input) {
    return new Date(input);
  }
}

class BOOLEAN extends Type {
  constructor() {
    super({ name: 'boolean', sqlType: 'boolean', stringFormat: false });
  }

  validAssignment(input) {
    return typeof input === 'boolean';
  }
  validSQLInput(input) {
    return input === 0 || input === 1;
  }

  output(input) {
    return input === 1 ? true : false;
  }

  assign(value) {
    return value === true ? 1 : 0;
  }
}

class EnumState {
  constructor(states, currentState = null, meta = {}) {
    this.__availableStates = states;
    this.__record = meta.record;
    this.__property = meta.property;
    this.value = currentState;

    states.forEach((state) => {
      Object.defineProperty(this, state, {
        get: () => state === this.value,
        set: () => { throw new Error('State\'s transition status is read-only'); }
      });
    });
  }

  next(save = false) {
    const {
      value,
      __availableStates: keys,
      __record: record,
      __property: prop
    } = this;

    if (value === null) {
      throw new Error('Nullish state cannot be transitioned to the next state');
    }

    const index = keys.indexOf(value);
    if (index + 1 === keys.length) {
      throw new Error('Ending state cannot be transitioned to the next state');
    }

    record[prop] = keys[index + 1];
    if (save) record.save();
  }

  previous(save = false) {
    const {
      value,
      __availableStates: keys,
      __record: record,
      __property: prop
    } = this;

    if (value === null) {
      throw new Error('Nullish state cannot be transitioned to the previous state');
    }

    const index = keys.indexOf(value);
    if (index - 1 < 0) {
      throw new Error('Starting state cannot be transitioned to the previous state');
    }

    record[prop] = keys[index - 1];
    if (save) record.save();
  }
}

class Enum extends Type {
  constructor(keys) {
    super({
      name: 'enum',
      sqlType:'integer',
      stringFormat: false,
      comparable: false,
      nullishValue: new EnumState(keys)
    });

    if ((new Set(keys)).size !== keys.length) {
      throw new Error('Duplicated keys are not allowed');
    }

    this.keys = keys;
  }

  validAssignment(value) {
    return this.keys.includes(value);
  }

  validSQLInput(value) {
    return (
      typeof value === 'number' &&
      value % 1 === 0 &&
      value < this.keys.length &&
      value >= 0
    );
  }

  output(input, meta) {
    const currentState = this.keys[input];
    const { record, property } = meta;
    return new EnumState(this.keys, currentState, { record, property });
  }

  assign(value) {
    return this.keys.indexOf(value);
  }
}

module.exports = {
  Type,
  Types: {
    Integer: new INTEGER(),
    String: new STRING(),
    Text: new TEXT(),
    Timestamp: new TIMESTAMP(),
    Boolean: new BOOLEAN(),
    Enum: keys => new Enum(keys),
  },
};
