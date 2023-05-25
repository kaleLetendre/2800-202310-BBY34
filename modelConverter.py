import tensorflowjs as tfjs
import tensorflow as tf

# Convert the model
model = tf.keras.models.load_model('modles/modle30.h5')

tfjs.converters.save_keras_model(model, 'modles')
