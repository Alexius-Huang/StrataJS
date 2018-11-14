# StrataJS
An ORM infrastructure design relative to Rails' ActiveRecord

## Usage

Tips: Comment out section are WIP unless the featured is specifed with the tag `[Completed]`

```js
import Strata from 'strata';

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

class UserModel extends Strata.Model {
  constructor() {
    super({
      tableName: 'users',
      fields: [
        { name: 'name',    type: String,  required: true },
        { name: 'account', type: String,  required: true, unique: true },
        { name: 'age',     type: Number,  default: null },
        { name: 'married', type: Boolean, required: true, default: false }
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
        { name: 'title',   type: String, required: true },
        { name: 'content', type: String, default: 'Content of $title' },
        { name: 'user_id', type: Strata.Reference(UserModel), required: true }
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

// Find some record, for instance, find the first user:
$users.find(1);

// Find first several rows of record, for instance, find the first five posts:
// $posts.first(5);

// Find last several rows of record, for instance, find the last five posts:
// $posts.last(5);

// Where expressions, for instance:
// $users.where({ age: 18 });                       // find users where age == 18
// $users.where({ age: { gte: 18 } });              // find users where age >= 18
// $users.where({ age: { gte: 12, lt: 18 } });      // find users where age >= 12 && age < 18
// $users.where({ name: 'Max', age: { gt: 18 } });  // find users where name == 'Max' && age > 18
// $users.where({ age: { ne: 18 } });               // find users where age != 18

// Limit expressions, for instance:
// $users.where({ age: { gte: 18 } }).limit(10);    // find at most 10 users where age >= 18

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

// After creates the relationship, the usable queries generated:
// For instance, if we want to get the posts of the specific user, we may attempt:
// $users.find(1).posts.all();  // Undefined method exception

// or if we want to find the user of the post (we don't need all() since the post only belongs to one specific user):
// $posts.find(1).user;       // Still get undefined method exception

// We need to create the relationship to generate those special query methods
// UserModel.hasMany(PostModel, { foreignKey: 'user_id' });
// PostModel.belongsTo(UserModel, { foreignKey: 'user_id' });

// You can then use:
// $users.find(1).posts.all();
// $posts.find(1).user;

// If you want to rename the relationship in a more instinctive way, such as:
// UserModel.hasMany(PostModel, { foreignKey: 'user_id', as: 'messages' });
// PostModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'author' });

// The query will become:
// $users.find(1).messages.all();
// $posts.find(1).author;

/* Basic Mutations */
// Creation
$users.create({ name: 'Maxwell', age: 18, married: false });

// Update - Similar to HTTP verb PUT
// $users.find(1).update({ name: 'Maximilian', age: 18, married: false });

// Mutation - Similar to HTTP verb PATCH, but you can simply pass a function
// $users.find(1).mutate((user) => {
//   user.name = 'Maximilian';
//   return user;
// });

// Batch Mutation - Update a batch of records, act like map function but with database commission
// $users.where({ age: { gte: 18 } }).mutate((user) => {
//   if (user.age > 30) {
//     user.married = true;
//   }
//   return user;
// });

// Destruction
// $users.find(1).destroy();

// Batch Destruction - Be careful with this
// $users.where({ updated: { lte: Strata.Time(1).month.ago } }).destroy();
// Delete user which havn't been active one month ago (Strata.Time is a pseudo helper function which
// should can be implement later)
```