import tensorflow as tf

# Load the HDF5 model
h5_model = tf.keras.models.load_model('modles/modle44.h5')

# Convert the model
converter = tf.lite.TFLiteConverter.from_keras_model(h5_model)
tflite_model = converter.convert()

# Save the model
with open('model.tflite', 'wb') as f:
    f.write(tflite_model)
