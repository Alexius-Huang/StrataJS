import test from 'ava';
import Strata from '../strata';
import fs from 'fs';
import { promisify } from 'util';
import { timingSafeEqual } from 'crypto';

const unlink = promisify(fs.unlink);

Strata.config.DB_FILE = './mutation_test.sqlite3';

const { STRING, INTEGER, BOOLEAN, TEXT } = Strata.Types;

let $users;
let $posts;

test.beforeEach(t => {
  class Users extends Strata.Model {
    constructor() {
      super({
        tableName: 'users',
        fields: [
          { name: 'name',    type: STRING,  required: true },
          { name: 'account', type: STRING,  required: true, unique: true },
          { name: 'age',     type: INTEGER, default: null },
          { name: 'married', type: BOOLEAN, required: true }
        ]
      });
    }
  }
  
  class Posts extends Strata.Model {
    constructor() {
      super({
        tableName: 'posts',
        fields: [
          { name: 'title',   type: STRING, required: true },
          { name: 'content', type: TEXT, default: null },
          { name: 'user_id', type: INTEGER, required: true }
        ]
      });
    }
  }

  $users = new Users();
  $posts = new Posts();

  $users.hasMany($posts, { foreignKey: 'user_id' });
  $posts.belongsTo($users, { foreignKey: 'user_id' });
});

test.afterEach.always(async t => {
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
    t.is(err.message, 'string type should be assigned in string format');
  }

  try {
    user.age = '18';
    throw new Error('Test failed');
  } catch (err) {
    t.is(err.message, 'integer type should be assigned in number format');
  }

  try {
    user.married = 2;
    throw new Error('Test failed');
  } catch(err) {
    t.is(err.message, 'boolean type should be assigned `true`/`false` or `1`/`0`');
  }

  user.name = 'Maximilian';
  user.account = 'maximilian-123';
  user.age = 18;
  user.married = 0;

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
