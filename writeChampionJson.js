const fs = require('fs');

// const championData = [];
// const lines = fs.readFileSync('champions.txt', 'utf-8').split('\n').map(line => {
//   return line.split(/[\(\):]/).map(part => part.trim()).filter(part => part !== '');
// });
// const output = JSON.stringify(lines, null, 2);

// fs.writeFileSync('champions.json', output, 'utf-8');

const fileData = fs.readFileSync('champions.json', 'utf-8');
const champsArr = JSON.parse(fileData);

const result = [
  200, 523, 523, 523,
  523, 523, 81, 81,
  523, 523, 523
];

const mappedStrings = result.map(id => {
  const champ = champsArr.find(champ => champ[2].toString() === id.toString());
  console.log(`ID: ${id}, Champ: ${JSON.stringify(champ)}`);
  return champ ? champ[1] : null;
});

console.log(mappedStrings);