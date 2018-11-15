import test from 'ava';
import Strata from '../strata';
import fs from 'fs';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

Strata.config.DB_FILE = './local_test.sqlite3';

const { STRING, INTEGER, BOOLEAN, TEXT } = Strata.Types;

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

const $users = new Users();
const $posts = new Posts();

test.before(t => {
  for (let i = 1; i <= 10; i++) {
    $users.create({ name: 'Maxwell', account: `maxwell-${i}`, age: i * 3, married: false });
  }

  for (let i = 1; i <= 50; i++) {
    $posts.create({ title: `Cats ${i}`, content: 'cat cat cat cat cat', user_id: i % 4 + 1 });
  }
});

test.after.always(async t => {
  await unlink('./local_test.sqlite3');
});

test('Model#all', t => {
  const users = $users.all();
  t.is(users.length, 10);

  const posts = $posts.all();
  t.is(posts.length, 50);
});

test('Model#find', t => {
  const user = $users.find(5);
  t.is(user.id, 5);
});

test('Model#first', t => {
  const users = $users.first(3).evaluate();
  t.is(users.length, 3);
  t.is(users[0].id, 1);
});

test('Model#last', t => {
  const users = $users.last(4).evaluate();
  t.is(users.length, 4);
  t.is(users[0].id, 7);
});

test('Model#where', t => {
  const users = $users.where({ account: 'maxwell-7' }).evaluate();
  t.is(users.length, 1);
  t.is(users[0].id, 7);
});

test('Model#where OR Chain', t => {
  const threeUsers = $users
    .where({ account: 'maxwell-2' })
    .where({ account: 'maxwell-3' })
    .where({ account: 'maxwell-8' })
    .evaluate();

  t.is(threeUsers.length, 3);
  t.is(threeUsers[0].id, 2);
  t.is(threeUsers[1].id, 3);
  t.is(threeUsers[2].id, 8);
});

test('Model#where AND Chain', t => {
  const posts = $posts.where({ user_id: 1, id: 48 }).evaluate();
  const noPost = $posts.where({ user_id: 1, id: 47 }).evaluate();

  t.is(posts.length, 1);
  t.is(posts[0].id, 48);
  t.is(noPost.length, 0);
});

test('Model#where, Model#limit, Model#first, Model#last Chain', t => {
  // WHERE user_id = 1 LIMIT 3
  const posts1 = $posts.where({ user_id: 1 }).limit(3).evaluate();
  t.is(posts1.length, 3);
  t.is(posts1[0].id, 4);
  t.is(posts1[1].id, 8);
  t.is(posts1[2].id, 12);

  // WHERE user_id = 2 ORDER BY id DESC LIMIT 4
  const posts2 = $posts.last(4).where({ user_id: 2 }).evaluate();
  t.is(posts2.length, 4);
  t.is(posts2[0].id, 37);
  t.is(posts2[1].id, 41);
  t.is(posts2[2].id, 45);
  t.is(posts2[3].id, 49);

  // WHERE user_id = 4 AND user_id = 2 ORDER BY id DESC LIMIT 7
  const posts3 = $posts.where({ user_id: 4 }).last(7).where({ user_id: 2 }).evaluate();
  t.is(posts3.length, 7);
  t.is(posts3[0].id, 37);
  t.is(posts3[1].id, 39);
  t.is(posts3[2].id, 41);
  t.is(posts3[3].id, 43);
  t.is(posts3[4].id, 45);
  t.is(posts3[5].id, 47);
  t.is(posts3[6].id, 49);
  t.is(posts3[0].user_id, 2);
  t.is(posts3[1].user_id, 4);
  t.is(posts3[2].user_id, 2);
  t.is(posts3[3].user_id, 4);
  t.is(posts3[4].user_id, 2);
  t.is(posts3[5].user_id, 4);
  t.is(posts3[6].user_id, 2);
});