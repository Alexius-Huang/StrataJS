class Type {
  constructor(params) {
    this.name = params.name;
    this.sqlType = params.sqlType;
    this.stringFormat = typeof params.stringFormat === 'boolean' ? params.stringFormat : true;
    this.comparable = typeof params.comparable === 'boolean' ? params.comparable : false;
  }

  /* Private Fields */
  __parseSQL(value) {
    if (this.stringFormat) {
      return `'${value}'`;
    }
    return value;
  }
  __output(input) {
    return input === null ? null : this.output(input);
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
    return Number(input);
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

class Enum extends Type {
  constructor(keys) {
    super({
      name: 'enum',
      sqlType:'integer',
      stringFormat: false,
      comparable: false,
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

  output(input) {
    return this.keys[input];
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
