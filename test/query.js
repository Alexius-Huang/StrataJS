import test from 'ava';
import Strata from '../strata';
import fs from 'fs';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

Strata.config.DB_FILE = './local_test.sqlite3';

const { Types } = Strata;

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

const $users = new Users();
const $posts = new Posts();

$users.hasMany($posts, { foreignKey: 'user_id' });
$posts.belongsTo($users, { foreignKey: 'user_id' });

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

test('Model#where comparison', t => {
  const users1 = $users.where({ age: { gt: 25 } }).evaluate();
  t.is(users1.length, 2);
  t.is(users1[0].age, 27);
  t.is(users1[1].age, 30);

  const users2 = $users.where({ age: { gt: 27 } }).evaluate();
  t.is(users2.length, 1);
  t.is(users2[0].age, 30);

  const users3 = $users.where({ age: { gte: 27 } }).evaluate();
  t.is(users3.length, 2);
  t.is(users3[0].age, 27);
  t.is(users3[1].age, 30);

  const users4 = $users.where({ age: { lt: 21, gte: 12 } }).evaluate();
  t.is(users4.length, 3);
  t.is(users4[0].age, 12);
  t.is(users4[1].age, 15);
  t.is(users4[2].age, 18);

  const users5 = $users.where({ age: { lte: 24, gt: 18 } }).evaluate();
  t.is(users5.length, 2);
  t.is(users5[0].age, 21);
  t.is(users5[1].age, 24);

  const users6 = $users.where({ age: { lt: 18, gt: 21 } }).evaluate();
  t.is(users6.length, 0);

  const users7 = $users.where({ age: { lt: 15, gte: 3, ne: 9 } }).evaluate();
  t.is(users7.length, 3);
  t.is(users7[0].age, 3);
  t.is(users7[1].age, 6);
  t.is(users7[2].age, 12);

  const users8 = $users.where({ age: { gt: 18 }, account: 'maxwell-9' }).evaluate();
  t.is(users8.length, 1);
  t.is(users8[0].age, 27);
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

test('Model#hasMany relationship', t => {
  const posts = $users.find(1).posts.evaluate();
  t.is(posts.length, 12);
});

test('Model#belongsTo relationship', t => {
  const user = $posts.find(1).user;
  t.is(user.id, 2);
});

test('Model#hasMany & Model#belongsTo Cyclic Behaviour', t => {
  const user = $users.find(1).posts.evaluate()[0].user;
  t.is(user.id, 1);
});
