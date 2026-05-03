const { searchJson } = require('./dist/cjs/index.js');

const data = [
  {name: 'MainStreet'},
  {name: 'Main Street'},
  {name: 'MainSt'},
  {name: 'Street'}
];

console.log('LIKE %St:', searchJson(data, 'name LIKE "%St"').length);
console.log('LIKE Main%:', searchJson(data, 'name LIKE "Main%"').length);
console.log('LIKE %Main%:', searchJson(data, 'name LIKE "%Main%"').length);
console.log('CONTAINS St:', searchJson(data, 'name CONTAINS "St"').length);
