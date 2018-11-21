import test from 'ava';
import Strata from '../strata';
import fs from 'fs';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

Strata.config.DB_FILE = './mutation_test.sqlite3';

const { Types } = Strata;

let $users;
let $posts;

test.before(t => {
  class Users extends Strata.Model {
    constructor() {
      super({
        tableName: 'users',
        fields: [
          { name: 'name',    type: Types.String,  required: true },
          { name: 'account', type: Types.String,  required: true, unique: true },
          { name: 'age',     type: Types.Integer, default: null },
          { name: 'married', type: Types.Boolean, required: true }
        ]
      });
    }
  }
  
  class Posts extends Strata.Model {
    constructor() {
      super({
        tableName: 'posts',
        fields: [
          { name: 'title',   type: Types.String, required: true },
          { name: 'content', type: Types.Text, default: null },
          { name: 'user_id', type: Types.Integer, required: true }
        ]
      });
    }
  }

  $users = new Users();
  $posts = new Posts();

  $users.hasMany($posts, { foreignKey: 'user_id' });
  $posts.belongsTo($users, { foreignKey: 'user_id' });
});

test.after.always(async t => {
  try {
    await unlink('./mutation_test.sqlite3');
  } catch(err) {
    /* Skip */
  }
});

test('Model#create', t => {
  const created = $users.create({ name: 'Maxwell', account: `maxwell-123`, age: 18, married: false });
  t.is(created.id, 1);

  const user = $users.find(1);
  t.is(user.id, 1);
});

test('Model#new', t => {
  const user = $users.new();
  t.is(user.name, null);
  t.is(user.saved, false);
  t.is(user.valid, false);

  try {
    user.name = 123;
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into type `string`');
  }

  try {
    user.age = '18';
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into type `integer`');
  }

  try {
    user.married = 2;
    throw new Error('Test failed');
  } catch(err) {
    t.is(err.message, 'Wrong type format when assigning into type `boolean`');
  }

  try {
    user.married = 0;
    throw new Error('Test failed');
  } catch(err) {
    t.is(err.message, 'Wrong type format when assigning into type `boolean`');
  }

  user.name = 'Maximilian';
  user.account = 'maximilian-123';
  user.age = 18;
  user.married = false;

  t.is(user.name, 'Maximilian');
  t.is(user.account, 'maximilian-123');
  t.is(user.age, 18);
  t.is(user.married, false);
  t.is(user.created, null);
  t.is(user.updated, null);
  t.is(user.id, null);

  t.is(user.persisted, false);

  try {
    user.abc = '123';
    throw new Error('Didn\'t raise the error when assigning wrong field');
  } catch (err) {
    t.is(err.message, 'Cannot set value in unknown field `abc`');
  }

  t.is(user.valid, true);
  user.save();
  t.is(user.saved, true);
  t.not(user.created, null);
  t.not(user.updated, null);
  t.not(user.id, null);

  t.is(user.persisted, true);

  const result = $users.find(user.id);
  t.is(result.name, 'Maximilian');
  t.is(result.age, 18);
  t.is(result.account, 'maximilian-123');
  t.is(result.married, false);

  t.is(result.saved, true);
  t.is(result.persisted, true);
});

test('Record#save', t => {
  const u = $users.new();
  t.is(u.saved, false);
  t.is(u.persisted, false);
  t.is(u.valid, false);

  try {
    u.save();
    throw new Error('Test Failed');
  } catch (err) {
    t.is(err.message, 'Record format isn\'t correct');
  }

  t.is(u.saved, false);
  t.is(u.persisted, false);
  t.is(u.valid, false);

  u.name = 'Maxims';
  u.age = 21;
  t.is(u.valid, false);
  u.married = false;
  u.account = 'maxims-456';

  t.is(u.saved, false);
  t.is(u.valid, true);

  u.save();

  t.is(u.saved, true);
  t.is(u.persisted, true);

  u.name ='Maxims Alexius';
  const beforeCreateTime = u.created;
  const beforeUpdateTime = u.updated;
  t.is(u.saved, false);
  t.is(u.persisted, true);

  u.save();
  t.is(u.saved, true);
  t.is(u.persisted, true);

  const afterCreateTime = u.created;
  const afterUpdateTime = u.updated;
  t.is(beforeCreateTime, afterCreateTime);
  t.not(beforeUpdateTime, afterUpdateTime);
});

test('Record#mutate', t => {
  const user = $users.create({
    name: 'mutation-test',
    account: 'mutation-test',
    age: 18,
    married: false,
  });

  t.is(user.persisted, true);
  t.is(user.saved, true);

  const beforeUpdateTime = user.updated;

  user.mutate((u) => {
    u.name = 'mutation-test-modified';
    return u;
  });

  t.is(user.saved, true);
  t.is(user.name, 'mutation-test-modified');

  const afterUpdateTime = user.updated;
  t.is(user.saved, true);
  t.not(beforeUpdateTime, afterUpdateTime);

  const queried = $users.find(user.id);
  t.is(queried.updated, user.updated);
  t.is(queried.name, 'mutation-test-modified');

  try {
    user.mutate((u) => {
      t.is(u.created, user.created);
      u.created = 123;
    });
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'Shouldn\'t assign value to read-only field `created`');
  }

  try {
    user.mutate((u) => {
      u.notExistedColumn;
    });
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'No column `notExistedColumn` exists');
  }

  try {
    user.mutate((u) => {
      u.age = 'string';
    });
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into type `integer`');
  }

  user.name = 'mutation-test-2';
  t.is(user.saved, false);
  try {
    user.mutate(user => {
      user.name = 'mutation-test-modified-2';
      return user;
    });
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'Should\'t mutate unsaved(mutated) record, mutation only applies to saved record only');
  }
});

test('Record#destroy', t => {
  const u = $users.new();
  try {
    u.destroy();
    throw new Error('Test Failure');
  } catch (err) {
    t.is(err.message, 'Shouldn\'t destroy impersisted record');
  }

  u.name = 'Maxwell';
  u.account = 'maxwell-789';
  u.age = 20;
  u.married = true;
  u.save();

  u.name = 'Maximilian';
  try {
    u.destroy();
    throw new Error('Test Failure');
  } catch (err) {
    t.is(err.message, 'Shouldn\'t destroy unsaved(mutated) record');
  }

  t.is(u.destroyed, false);

  const user = $users.find(u.id);
  t.is(user.destroyed, false);
  user.destroy();
  t.is(user.destroyed, true);

  try {
    user.name = 'Maxim';
    throw new Error('Test Failure');
  } catch (err) {
    t.is(err.message, 'Record is read-only since it has been destroyed');
  }

  const noResult = $users.find(user.id);
  t.is(noResult, null);
});

test('Records#destroy', t => {
  const users = [];
  for (let i = 1; i <= 10; i += 1) {
    const created = $users.create({ name: 'batch-destroy', account: `maxwell-${i}`, age: i * 3, married: false });
    users.push(created);
  }

  t.is(users.length, 10);

  const result = $users.where({ name: 'batch-destroy', age: { gt: 21 } }).evaluate();
  t.is(result.length, 3);
  t.is(result.destroyed, false);
  t.is(result[0].destroyed, false);
  result.destroy();
  t.is(result.destroyed, true);
  t.is(result[0].destroyed, true);

  const afterDestroyed = $users.where({ name: 'batch-destroy' }).evaluate();
  t.is(afterDestroyed.length, 7);
});
