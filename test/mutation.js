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
    t.is(err.message, 'Wrong type format when assigning into column `name` with type `string`');
  }

  try {
    user.age = '18';
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'Wrong type format when assigning into column `age` with type `integer`');
  }

  try {
    user.married = 2;
    throw new Error('Test failed');
  } catch(err) {
    t.is(err.message, 'Wrong type format when assigning into column `married` with type `boolean`');
  }

  try {
    user.married = 0;
    throw new Error('Test failed');
  } catch(err) {
    t.is(err.message, 'Wrong type format when assigning into column `married` with type `boolean`');
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
  const beforeCreateTime = u.created.getTime();
  const beforeUpdateTime = u.updated.getTime();
  t.is(u.saved, false);
  t.is(u.persisted, true);

  u.save();
  t.is(u.saved, true);
  t.is(u.persisted, true);

  const afterCreateTime = u.created.getTime();
  const afterUpdateTime = u.updated.getTime();
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

  const beforeUpdateTime = user.updated.getTime();

  user.mutate((u) => {
    u.name = 'mutation-test-modified';
    u.married = true;
    return u;
  });

  t.is(user.saved, true);
  t.is(user.name, 'mutation-test-modified');
  t.is(user.married, true);

  const afterUpdateTime = user.updated.getTime();
  t.is(user.saved, true);
  t.not(beforeUpdateTime, afterUpdateTime);

  const queried = $users.find(user.id);
  t.is(queried.updated.getTime(), user.updated.getTime());
  t.is(queried.name, 'mutation-test-modified');

  try {
    user.mutate((u) => {
      t.is(u.created.getTime(), user.created.getTime());
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
    t.is(err.message, 'Wrong type format when assigning into column `age` with type `integer`');
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

test('Records#mutate', t => {
  const users = [];
  for (let i = 1; i <= 10; i += 1) {
    const created = $users.create({ name: 'batch-mutation', account: `batch-mutation-${i}`, age: i * 3, married: false });
    users.push(created);
  }

  const result = $users.where({ name: 'batch-mutation', age: { gt: 18 } }).evaluate();
  t.is(result.length, 4);
  const beforeUpdateTime = result[0].updated.getTime();

  result.mutate((u) => {
    u.name = 'batch-mutation-modified';
    u.married = true;
  });

  const afterUpdateTime = result[0].updated.getTime();
  t.not(beforeUpdateTime, afterUpdateTime);
  t.is(result[0].name, 'batch-mutation-modified');
  t.is(result[0].married, true);

  const queried = $users.where({ name: 'batch-mutation-modified' }).evaluate();
  t.is(queried.length, 4);
  t.is(queried[0].married, true);
});

test('Records#mutateEach', t => {
  const users = [];
  for (let i = 1; i <= 10; i += 1) {
    const created = $users.create({ name: 'batch-each-mutation', account: `batch-each-mutation-${i}`, age: i * 3, married: false });
    users.push(created);
  }

  const result = $users.where({ name: 'batch-each-mutation' }).evaluate();

  const notMutatedBeforeUpdateTime = result[0].updated.getTime();
  const mutatedBeforeUpdateTime = result[5].updated.getTime();

  result.mutateEach((u) => {
    if (u.age >= 18) {
      u.married = true;
    }
  });

  const notMutatedAfterUpdateTime = result[0].updated.getTime();
  const mutatedAfterUpdateTime = result[5].updated.getTime();
  t.is(notMutatedBeforeUpdateTime, notMutatedAfterUpdateTime);
  t.not(mutatedBeforeUpdateTime, mutatedAfterUpdateTime);

  for (let i = 0; i < result.length; i += 1) {
    const record = result[i];
    if (record.age >= 18) {
      t.is(record.married, true);
    } else {
      t.is(record.married, false);
    }
  }

  const queried = $users.where({ name: 'batch-each-mutation', married: true }).evaluate();
  t.is(queried.length, 5);
  t.is(queried[0].age, 18);
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
