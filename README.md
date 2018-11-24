# StrataJS
An ORM infrastructure design relative to Rails' ActiveRecord implemented in JS

## Installation

Using NPM:

```
$ npm install strata-orm
```

Or using Yarn:

```
$ yarn add strata-orm
```

## Documentation

### Defining Models

```js
import Strata from 'strata-orm';

const { Types } = Strata;

class UserModel extends Strata.Model {
  constructor() {
    super({
      tableName: 'users',
      fields: [
        { name: 'name',    type: Types.String,  required: true },
        { name: 'account', type: Types.String,  required: true, unique: true },
        { name: 'age',     type: Types.Integer,  default: null },
        { name: 'married', type: Types.Boolean, required: true, default: false }
      ]
    });
  }
}

class PostModel extends Strata.Model {
  constructor() {
    super({
      tableName: 'posts',
      fields: [
        { name: 'title',   type: Types.String, required: true },
        { name: 'content', type: Types.String, default: 'Content of $title' },
        { name: 'user_id', type: Types.Integer, required: true }
      ]
    });
  }
}

/* Modal Instances */
const User = new UserModel();
const Post = new PostModel();
```

### Strata Model Built-in Types

#### `Strata.Type`

#### `Strata.Types.Integer`

#### `Strata.Types.String`

#### `Strata.Types.Text`

#### `Strata.Types.Timestamp`

#### `Strata.Types.Boolean`

#### `Strata.Types.Enum`

### Query

#### `Strata.Model#find -> Record` Find Single Record

For instance, get user with `id = 1`:

```js
const User = new UserModel();
User.find(1);
```

#### `Query#evaluate -> Records` Get Query Result

Using the `where` / `limit` / `first` / `last` will yield a `Query` object. You need to expand the result by calling the `Query#evaluate` method:

```js
const User = new UserModel();
const query = User.where({ age: 18 });
const result = query.evaluate();
```

#### `Strata.Model#limit | Query#limit -> Query` Limit Query Result

Limit the record result number. Notice that the `Query` object also have `limit` method which means that the query is chainable:

```js
const User = new UserModel();

/* Get the fisrt 5 users */
const result1 = User.limit(5).evaluate();

/* Get the first 5 users who are aged over 18 */
const result2 = User.where({ age: { gt: 18 } }).limit(5);
```

#### `Strata.Model#first | Query#first -> Query` Get First of Records

Alias to `Strata.Model#limit` and `Query#limit`

#### `Strata.Model#last | Query#last -> Query` Get Last of Records

Limit the record result number reversely. Notice that the `Query` object also have `last` method which means that the query is chainable:

```js
const User = new UserModel();

/* Get the last 5 users */
const result1 = User.last(5).evaluate();

/* Get the last 5 users who are aged over 18 */
const result2 = User.where({ age: { gt: 18 } }).last(5);
```

#### `Strata.Model#where | Query#where -> Query` Get Records Under Some Condition

Query the record conditionally. Notice that the `Query` object also have `last` method which means that the query is chainable.

For instance, you can query a specific value with corresponding column:

```js
const User = new UserModel();

/* Get users where their age is equal to 18 */
const result1 = User.where({ age: 18 }).evaluate();

/* Get users where their name is equal to 'Maxwell' */
const result2 = User.where({ name: 'Maxwell' }).evaluate();
```

Or you can query in `AND` logic by specifying more properties in the `where` clause:

```js
/* Get users where their name is equal to 'Maxwell' and not married */
const result1 = User.where({ name: 'Maxwell', married: false }).evaluate();
```

To query in `OR` logic, you should use chained where clause:

```js
/* Get users where their name is equal to 'Maxwell' or not married */
const result2 = User.where({ name: 'Maxwell' }).where({ married: false }).evaluate();
```

If the type of the column when defined in model is specified `comparable`, for instance:

```js
Strata.Types.Integer.comparable // true
Strata.Types.String.comparable  // false
```

You can use compare operations in where clause:

```js
/* Get users aged less than 18 */
const result1 = User.where({ age: { lt: 18 } }).evaluate();

/* Get users aged less than or equal to 18 */
const result2 = User.where({ age: { lte: 18 } }).evaluate();

/* Get users aged greater than 18 */
const result3 = User.where({ age: { gt: 18 } }).evaluate();

/* Get users aged greater than or equal to 18 */
const result4 = User.where({ age: { gte: 18 } }).evaluate();

/* Get users aged not equal to 18 */
const result5 = User.where({ age: { ne: 18 } }).evaluate();

/* Get users aged greater than 12 AND less than or equal to 18 */
const result6 = User.where({ age: { gt: 12, lte: 18 } }).evaluate();

/* Get users aged less than or equal to 12 OR greater than 18 */
const result6 = User.where({ age: { lte: 12 } }).where({ age: { gt: 18 } }).evaluate();
```

### Mutation

#### `Strata.Model#new -> Record` Get New Record Instance

Returns a new record instance which is mutable but havn't been saved yet. When commit to save the record, you need to call `Record#save` method, for instance:

```js
const user = User.new();

user.name = 'Maxwell';
user.account = 'maxwell123';
user.age = 18;
user.married = false;

user.save();
```

Hint: You can also use `Record#saved` to check whether the record is saved in database:

```js
const user = User.new();
console.log(user.saved); // => false

user.name = 'Maxwell';
...

user.save();
console.log(user.saved); // => true
```

#### `Strata.Model#create -> Record` Directly Create A Saved Record

Shortcut for creating a new record instance and save it to the database. You need to specify the required column's matching value, for instance:

```js
const user = User.create({
  name: 'Maxwell',
  account: 'maxwell123',
  age: 18,
  married: false
});

console.log(user.saved); // true
```

#### `Record#mutate`

#### `Record#destroy`

#### `Records#mutate`

#### `Records#mutateEach`

#### `Records#destroy`

### Record Status Checking

#### `Record#saved`

#### `Record#persisted`

#### `Record#destroyed`

#### `Records#destroyed`

### Model Relationships

#### `Strata.Model#hasMany`

#### `Strata.Model#belongsTo`

## Planning Features

```js
import Strata from 'strata-orm';

/**
 *  Strata's configuration list with default values below:
 *  Strata.config.DB_FILE    = './db.sqlite3' [Completed]
 **/
 
/**
 *  Strata's available global hooks:
 *  Strata.hooks.beforeCreate  = function() {}
 *  Strata.hooks.afterCreate   = function() {}
 *  Strata.hooks.beforeUpdate  = function() {}
 *  Strata.hooks.afterUpdate   = function() {}
 *  Strata.hooks.beforeDestroy = function() {}
 *  Strata.hooks.afterDestroy  = function() {}
 *  Strata.hooks.beforeCommit  = function() {}
 *  Strata.hooks.afterCommit   = function() {}
 **/

const { Types } = Strata;

class UserModel extends Strata.Model {
  constructor() {
    super({
      tableName: 'users',
      fields: [
        { name: 'name',    type: Types.String,  required: true },
        { name: 'account', type: Types.String,  required: true, unique: true },
        { name: 'age',     type: Types.Integer,  default: null },
        { name: 'married', type: Types.Boolean, required: true, default: false }
      ]
    });
    /**
     *  Options parameter in `fields` are:
     *  - name: Name of the table which is `required`
     *  - type: Type of the table which default is `String`, but recommend specify it
     *  - required: The field value must not contain `null` value, default is `false`
     *  - unique: The field values in every record must be distinct, default is `false`
     *  - default: The field's default value, if required is `false`, then default is `null` or specified default value;
     *             Otherwise, if required is `true`, then default value will be ignored because every commit in record, you
     *             will need to save the record with some value in that field
     **/

    /**
     *  Defaults which you don't need to configured yourself, unless you need specific configuration:
     *  this.hasPrimaryKey = true;
     *  this.hasCreateField = true;
     *  this.hasUpdateField = true;
     *
     *  this.primaryKey = { name: 'id', type: Strata.Types.ID, required: true, autoIncrement: true };
     *  this.createField = { name: 'created', type: Strata.Types.Now, required: true };
     *  this.updateField = { name: 'updated', type: Strata.Types.Now, required: true };
     **/
  }
  
  /* You can define hook methods below also, it will override the global hook */
  // beforeCreate()  {}
  // afterCreate()   {}
  // beforeUpdate()  {}
  // afterUpdate()   {}
  // beforeDestroy() {}
  // afterDestroy()  {}
  // beforeCommit()  {}
  // afterCommit()   {}
  
  /* Custom queries */
  // adults() {
    // Query will be listed in the belowing sections
    // return this.all().where({ age: { gte: 18 } });
  // }
  
  /* Custom mutations */
  // getDivorce(id) {
  //   this.find(id).mutate((user) => {
  //     user.married = false;
  //     return user;
  //   });
  // }
}

class PostModel extends Strata.Model {
  constructor() {
    super({
      tableName: 'posts',
      fields: [
        { name: 'title',   type: Types.String, required: true },
        { name: 'content', type: Types.String, default: 'Content of $title' },
        { name: 'user_id', type: Types.Integer, required: true }
      ]
    });
    // In content field, there is a template formatted value which interpolates the value of title field
    // in the defualt value of content field
    
    // void Strata.Reference(Strata.Model model, String primary_key = 'id')
    // Reference other model to create the model relationship through primary key, default primary_key is field `id`
  }
}

const $users = new UserModel();
const $posts = new PostModel();

/* Basic Queries */
// Get all records, for instance, find all users:
const allUsers = $users.all();

// Sort expressions, for instance:
// allUsers.sort({ id: 'DESC' });               // find all users sorted by ID in descending order
// allUsers.sort({ age: 'ASC' });               // find all users sorted by age in ascending order
// allUsers.sort({ age: 'ASC', id: 'DESC' });   // find all users first sorted by age in ascending order
                                                // then sort ID in descending order
// allUsers.sort((a, b) => a.age > b.age);      // find all users sorted by age in descending order

// Pluck expressions, get specific column value of the queried records:
// allUsers.pluck('name');                      // get an array of names of the user records
// allUsers.pluck(['name']);                    // same as above
// allUsers.pluck(['name', 'age']);             // get an array of pair of name and age (in array format) of the user records

// We need to create the relationship to generate those special query methods
$users.hasMany($posts, { foreignKey: 'user_id' });
$posts.belongsTo($users, { foreignKey: 'user_id' });

// You can then use:
$users.find(1).posts.evaluate();
$posts.find(1).user;

// If you want to rename the relationship in a more instinctive way, such as:
// UserModel.hasMany(PostModel, { foreignKey: 'user_id', as: 'messages' });
// PostModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'author' });

// The query will become:
// $users.find(1).messages.all();
// $posts.find(1).author;

/* Basic Mutations */
// Creation
$users.create({ name: 'Maxwell', age: 18, married: false });

// New
const u = $users.new();
u.saved // false

u.save() // Error: Name, Account and Married is Required

u.name = 'Maxwell';
u.age = 18;
u.married = false;

u.save();
u.saved; // true

// Update - Similar to HTTP verb PUT
// $users.find(1).update({ name: 'Maximilian', age: 18, married: false });

// Mutation - Similar to HTTP verb PATCH, but you can simply pass a function
$users.find(1).mutate((user) => {
  user.name = 'Maximilian';
});

// Batch Mutation - Update a batch of records, act like map function but with database commission
// $users.where({ age: { gte: 18 } }).mutate((user) => {
//   if (user.age > 30) {
//     user.married = true;
//   }
//   return user;
// });

// Destruction
$users.find(1).destroy();

// Batch Destruction - Be careful with this
// $users.where({ updated: { lte: Strata.Time(1).month.ago } }).destroy();
// Delete user which havn't been active one month ago (Strata.Time is a pseudo helper function which
// should can be implement later)

// Relational Creation
// Notice that we assume you've already done creating relationships:
// $users.find(1).createPost({ title: '...', content: '...' });

// Relational Update
// You can just update the record when you've already fetched
// $posts.find(1).user().update({ name: '...', age: '...', ... });

// Relational Mutation
// $posts.find(1).user().mutate((user) => {
//   user.name = 'Alexius';
//   return user;
// });

// Relational Batch Mutation
// $users.find(1).posts().mutate((post) => {
//   post.title = '...';
//   return post;
// });

// Relational Destruction
// $posts.find(1).user().destroy();

// Relational Batch Destruction
// $users.find(1).posts().destroy();
```