// hash.cjs
const bcrypt = require('bcryptjs');
const password = '12345';
const saltRounds = 10;
bcrypt.hash(password, saltRounds).then(hash => {
  console.log('Hash:', hash);
});