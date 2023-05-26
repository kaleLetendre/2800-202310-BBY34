const tf = require('@tensorflow/tfjs');
const fs = require('fs');

async function loadModel() {
  const model = await tf.loadLayersModel('file://models/model.json');
  console.log('Model loaded successfully!');
  return model;
}

function probabilityReader(predictions, champions) {
  const output = [];
  for (let i = 0; i < 11; i++) {
    let highest = 0;
    let index = 0;
    for (let j = 0; j < 164; j++) {
      if (predictions.arraySync()[0][i][j] > highest) {
        highest = predictions.arraySync()[0][i][j];
        index = j;
      }
    }
    output.push(champions[index]);
  }
  return output;
}

function readChampions(path) {
  const champions = [];
  const lines = fs.readFileSync(path, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].split(':')[1];
    champions.push(parseInt(line));
  }
  return champions;
}

async function ask(question) {
  const champions = readChampions('champions.txt');
  champions.push(-1); // null
  champions.push(100); // 1st team
  champions.push(200); // 2nd team
  champions.push(0); // not selected

  let test_data = tf.zeros([1, 2, 11], 'float32');

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 11; j++) {
      const value = question[i][j];
      const indices = [0, i, j];
      test_data = tf.tensor(test_data.arraySync().map((row, rowIdx) =>
        rowIdx === indices[0] ? row.map((col, colIdx) =>
          colIdx === indices[1] ? col.map((_, cellIdx) =>
            cellIdx === indices[2] ? value : col[cellIdx]
          ) : col
        ) : row
      ));
    }
  }

  test_data = tf.tensor(test_data.arraySync().map((row, i) =>
    row.map((col, j) =>
      col.map(cell => champions.indexOf(parseInt(cell)))
    )
  ));

  console.log(test_data.shape);
  try {

    // Load the model
    const model = await loadModel();

    // Reshape test_data to match the expected shape [null, 2, 11]
    const reshapedTestData = tf.reshape(test_data, [1, 2, 11]);

    // Make predictions
    const predictions = model.predict(reshapedTestData);
    const result = probabilityReader(predictions, champions);

    // convert back to String
    const fileData = fs.readFileSync('champions.json', 'utf-8');
    const champsArr = JSON.parse(fileData);

    const mappedStrings = result.map(id => {
      const champ = champsArr.find(champ => champ[2].toString() === id.toString());
      console.log(`ID: ${id}, Champ: ${JSON.stringify(champ)}`);
      return champ ? champ[1] : null;
    });
    
    mappedStrings.shift();

    return mappedStrings;
  } catch (error) {
    console.error('Error loading the model:', error);
  }
}

module.exports = ask;