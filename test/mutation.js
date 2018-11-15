import test from 'ava';
import Strata from '../strata';
import fs from 'fs';
import { promisify } from 'util';

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
  await unlink('./mutation_test.sqlite3');
});

test('Model#create', t => {
  const created = $users.create({ name: 'Maxwell', account: `maxwell-123`, age: 18, married: false });
  t.is(created.id, 1);

  const user = $users.find(1);
  t.is(user.id, 1);
});
