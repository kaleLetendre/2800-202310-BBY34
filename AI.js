const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');


function probabilityReader(predictions, champions) {
  const output = [];
  for (let i = 0; i < 11; i++) {
    let highest = 0;
    let index = 0;
    for (let j = 0; j < 164; j++) {
      if (predictions[0][i][j] > highest) {
        highest = predictions[0][i][j];
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
    let champions = readChampions('data/champions.txt');
    champions.push(-1); // null
    champions.push(100); // 1st team
    champions.push(200); // 2nd team
    champions.push(0); // not selected

    //load tflite model
    const model = await tf.loadGraphModel('file://model.tflite');
    tf.print(model.summary());

    let test_data = tf.zeros([1, 2, 11]);

    test_data = question;
    console.log(test_data);

    //____________________________________________________________pass your data into test_data in the following format____________________________________________________________
    //RULES:
      //order cannot be changed, and all champions must be represented by their id number (see data/champions.txt for id numbers)
      //test_data[0][0] is the team that you are on, test_data[0][1] is the enemy team
      //the team the goes first in the draft is team 100 (blue side), the team that goes second is team 200 (red side)
      //the less nulll (-1 or 0) calues that are in the array, the more accurate the prediction will be
      //-1 means the ban was identical to another or the ban was not selected
      //0 means the pick has not been selected yet

    // test_data[0][0] = [200, 81, 110, 523, 429, 60, 875, 41, 21, 154, 157];
                    // [user_team, ban1, ban2, ban3, ban4, ban5, pick1, pick2, pick3, pick4, pick5]
    // test_data[0][1] = [100, 523, 412, 429, 80, 58, 111, 142, 236, 78, 98];
                    // [enemy_team, ban1, ban2, ban3, ban4, ban5, pick1, pick2, pick3, pick4, pick5]
    //_____________________________________________________________________________________________________________________________________________________________________________

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 11; j++) {
            test_data[0][i][j] = champions.indexOf(parseInt(test_data[0][i][j]));
        }
    }

    const predictions = model.predict(test_data); 
    const result = probabilityReader(predictions, champions);

    console.log(result); //this is the result, an 11 element array of the most probable champion for each position
    //[team, ban1, ban2, ban3, ban4, ban5, pick1, pick2, pick3, pick4, pick5]
    return result; //return the result (11 element array)
}

module.exports = ask;

