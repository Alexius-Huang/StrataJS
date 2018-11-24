import test from 'ava';
import Strata from '../strata';
import fs from 'fs';
import { promisify } from 'util';
import { isIterable } from 'core-js';

const unlink = promisify(fs.unlink);

Strata.config.DB_FILE = './types_test.sqlite3';

const { Types } = Strata;

// test.before(t => {});

test.after.always(async t => {
  await unlink('./types_test.sqlite3');
});

test('Types.String', t => {
  class StringTest extends Strata.Model {
    constructor() {
      super({
        tableName: 'stringtest',
        fields: [
          { name: 'content', type: Types.String },
        ]
      });
    }
  }

  const $string = new StringTest();

  const result = $string.create({ content: 'hello world' });
  t.is(result.content, 'hello world');
  t.is(result.persisted, true);

  try {
    $string.create({ content: 123 });
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `content` with type `string`');
  }

  const queried = $string.find(result.id);
  t.is(queried.content, 'hello world');

  const where = $string.where({ content: 'hello world' }).evaluate();
  t.is(where.length, 1);
  t.is(where[0].content, 'hello world');

  const newString = $string.new();

  try {
    newString.content = 123;
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `content` with type `string`');
  }

  try {
    newString.id = 1;
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Cannot assign value to read-only field `id`');
  }

  newString.content = 'bye world';
  newString.save();
  t.is(newString.content, 'bye world');

  const nullString = $string.new();
  nullString.save();
  t.is(nullString.content, null);
});

// test('Types.Integer', t => {
//   class IntegerTest extends Strata.Model {
//     constructor() {
//       super({
//         tableName: 'integertest',
//         fields: [
//           { name: 'integer', type: Types.Integer },
//         ]
//       });
//     }
//   }

//   const $integer = new IntegerTest();

//   const result = $integer.create({ content: 'hello world' });
//   t.is(result.content, 'hello world');
//   t.is(result.persisted, true);

//   const queried = $integer.find(result.id);
//   t.is(queried.content, 'hello world');

//   const where = $integer.where({ content: 'hello world' }).evaluate();
//   t.is(where.length, 1);
//   t.is(where[0].content, 'hello world');

//   const newInteger = $integer.new();

//   try {
//     newInteger.content = 123;
//     throw new Error('Test failure');
//   } catch (err) {
//     t.is(err.message, 'Wrong type format when assigning into type `Integer`');
//   }

//   try {
//     newInteger.id = 1;
//     throw new Error('Test failure');
//   } catch (err) {
//     t.is(err.message, 'Cannot assign value to read-only field `id`');
//   }
// });

test.only('Types.Enum', t => {
  class EnumTest extends Strata.Model {
    constructor() {
      super({
        tableName: 'enumtest',
        fields: [
          {
            name: 'state',
            type: Types.Enum(['active', 'inactive', 'destroyed']),
            required: true,
          },
          {
            name: 'anotherState',
            type: Types.Enum(['active', 'inactive', 'expired']),
          },
        ]
      });
    }
  }

  const $enum = new EnumTest();

  const result = $enum.create({ state: 'active' });
  t.is(result.state.value, 'active');

  const newEnum = $enum.new();

  try {
    $enum.create({ state: 123 });
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `state` with type `enum`');
  }

  try {
    $enum.create({ state: 'unexisted-state' });
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `state` with type `enum`');
  }
  
  try {
    newEnum.state = 123;
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `state` with type `enum`');
  }

  try {
    newEnum.state = 'hello world';
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `state` with type `enum`');
  }

  newEnum.state = 'inactive';
  newEnum.save();

  t.is(newEnum.state.value, 'inactive');
  t.is(newEnum.anotherState.value, null);

  newEnum.anotherState = 'expired';
  newEnum.save();
  t.is(newEnum.anotherState.value, 'expired');

  t.is(newEnum.state.active, false);
  t.is(newEnum.state.inactive, true);
  t.is(newEnum.state.destroyed, false);
  t.is(newEnum.anotherState.active, false);
  t.is(newEnum.anotherState.inactive, false);
  t.is(newEnum.anotherState.expired, true);

  t.is(newEnum.saved, true);
  newEnum.state.next();
  t.is(newEnum.state.active, false);
  t.is(newEnum.state.inactive, false);
  t.is(newEnum.state.destroyed, true);
  t.is(newEnum.saved, false);
  newEnum.save();
  t.is(newEnum.state.active, false);
  t.is(newEnum.state.inactive, false);
  t.is(newEnum.state.destroyed, true);
  t.is(newEnum.saved, true);

  newEnum.anotherState.previous();
  t.is(newEnum.anotherState.active, false);
  t.is(newEnum.anotherState.inactive, true);
  t.is(newEnum.anotherState.expired, false);
  t.is(newEnum.saved, false);
  newEnum.save();
  t.is(newEnum.anotherState.active, false);
  t.is(newEnum.anotherState.inactive, true);
  t.is(newEnum.anotherState.expired, false);
  t.is(newEnum.saved, true);

  try {
    newEnum.state.next();
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Ending state cannot be transitioned to the next state');
  }

  newEnum.state.previous(true);
  t.is(newEnum.saved, true);
  t.is(newEnum.state.active, false);
  t.is(newEnum.state.inactive, true);
  t.is(newEnum.state.destroyed, false);
  newEnum.state.previous(true);
  t.is(newEnum.saved, true);
  t.is(newEnum.state.active, true);
  t.is(newEnum.state.inactive, false);
  t.is(newEnum.state.destroyed, false);

  try {
    newEnum.state.previous(true);
    throw new Error('Test failure');
  } catch (err) {
    t.is(err.message, 'Starting state cannot be transitioned to the previous state');
  }
});
