const tf = require('@tensorflow/tfjs');
console.log(tf.version);

async function run() {
  try {
    const model = await tf.loadLayersModel('file://modles/model.json');
    model.summary();
  } catch (error) {
    console.error('Error loading model:', error);
  }
}

run();
