class Type {
  constructor(params) {
    this.name = params.name;
    this.sqlType = params.sqlType;
    this.stringFormat = typeof params.stringFormat === 'boolean' ? params.stringFormat : true;
    this.comparable = typeof params.comparable === 'boolean' ? params.comparable : false;
  }

  __parseSQL(value) {
    if (this.stringFormat) {
      return `'${value}'`;
    }
    return value;
  }

  validAssignment(value) {
    return typeof value === 'string';
  }

  strongValidAssignment(value) {
    if (!this.validAssignment(value)) {
      throw new Error(`Wrong type format when assigning into type \`${this.name}\``);
    }
    return true;
  }

  validSQLInput(value) {
    return typeof value === 'string'; 
  }

  strongValidSQLInput(value) {
    if (!this.validSQLInput(value)) {
      throw new Error(`Wrong type format when assigning into type \`${this.name}\``);
    }
    return true;
  }

  output(input) { return input === null ? null : String(input); }
  assign(value) {
    if (this.strongValidAssignment(value)) {
      return value;
    }
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
    return input === null ? null : Number(input);
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
    return input === null ? null : Number(input);
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
    if (input === null) {
      return null;
    }
    return input === 1 ? true : false;
  }

  assign(value) {
    if (this.strongValidAssignment(value)) {
      return value === true ? 1 : 0;
    }
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
  },
};
