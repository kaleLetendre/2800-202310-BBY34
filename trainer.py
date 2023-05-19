import tensorflow as tf
import numpy as np
import pickle

# ____________________FUNCTIONS____________________
def read_champions(path):
    champions = []
    with open(path, 'rb') as f:
        # read lines from text file
        lines = f.readlines()
        # extract int from each line
        for line in lines:
            line = line.decode('utf-8').split(':')[1]
            # convert to int
            champions.append(int(line))
        return champions
def read_pickle(path):
    with open(path, 'rb') as f:
        while True:
            try:
                yield pickle.load(f)
            except EOFError:
                break
def probability_reader(predictions,champions):
    output = []
    for i in range(11):
        highest = 0
        index = 0
        for j in range(164):
            if predictions[0][i][j] > highest:
                highest = predictions[0][i][j]
                index = j
        output.append(champions[index])
    return output

# ____________________READ DATA____________________
print ("reading data")
path = 'data/match_data_version1_processed.pickle'
champions = read_champions('data/champions.txt')
champions.append(-1)#null
champions.append(100)#1st team
champions.append(200)#2nd team
champions.append(0)#not selected
# Step 1: Load the data
data = read_pickle(path)
dataArray = []
for row in data:
    dataArray.append(row)
processedData = np.zeros((len(dataArray), 2, 11))
for i in range(len(dataArray)):
    row = dataArray[i]
    buffer = 0
    for j in range(len(row[1])):
        if j != 1 and j != 7:
            processedData[i][0][j-buffer] = row[1][j]
            processedData[i][1][j-buffer] = row[2][j]
        else:
            buffer += 1
# Step 2: Split the data into training and validation sets
training_data = processedData[:int(len(processedData)*0.8)]
validation_data = processedData[int(len(processedData)*0.8):]

# ____________________EXPAND DATA____________________
print("expanding data")
# expand the training and validation data by 20 time by replacing tail element with null values
training_data_x = np.zeros((len(training_data)*20, 2, 11))
training_data_y = np.zeros((len(training_data)*20, 11))
for i in range(len(training_data)):
    truncated = 0
    for j in range(20):
        if truncated == 0:
            training_data_x[i*20+j] = training_data[i]
        else:
            training_data_x[i*20+j] = training_data_x[i*20+j-1]
        for k in range(truncated):
            if truncated%2 == 0:
                training_data_x[i*20+j][0][10-(int)(k/2)] = 0
            else:
                training_data_x[i*20+j][1][10-(int)(k/2)] = 0
        truncated += 1
        training_data_y[i*20+j] = training_data[i][0]
validation_data_x = np.zeros((len(validation_data)*20, 2, 11))
validation_data_y = np.zeros((len(validation_data)*20, 11))
for i in range(len(validation_data)):
    truncated = 0
    for j in range(20):
        if truncated == 0:
            validation_data_x[i*20+j] = validation_data[i]
        else:
            validation_data_x[i*20+j] = validation_data_x[i*20+j-1]
        for k in range(truncated):
            if truncated%2 == 0:
                validation_data_x[i*20+j][0][10-(int)(k/2)] = 0
            else:
                validation_data_x[i*20+j][1][10-(int)(k/2)] = 0
        truncated += 1
        validation_data_y[i*20+j] = validation_data[i][0]

# ____________________MAP DATA____________________
print("mapping data to champion id index")
# map training and validation data to champion id
for i in range(len(training_data_x)):
    for j in range(2):
        for k in range(11):
            training_data_x[i][j][k] = champions.index((int)(training_data_x[i][j][k]))
print("resulting number of rows training_in: " + str(len(training_data_x)))
for i in range(len(training_data_y)):
    for j in range(11):
        training_data_y[i][j] = champions.index((int)(training_data_y[i][j]))
print("resulting number of rows training_out: " + str(len(training_data_y)))
for i in range(len(validation_data_x)):
    for j in range(2):
        for k in range(11):
            validation_data_x[i][j][k] = champions.index((int)(validation_data_x[i][j][k]))
print("resulting number of rows validation_in: " + str(len(validation_data_x)))
for i in range(len(validation_data_y)):
    for j in range(11):
        validation_data_y[i][j] = champions.index((int)(validation_data_y[i][j]))
print("resulting number of rows validation_out: " + str(len(validation_data_y)))

# sparse_categorical_crossentropy loss function handles the conversion of integer to one-hot vector better
# # ____________________CONVERT DATA TO PROBABILITY DISTRIBUTION____________________
# print("converting data output to probability distribution")
# # convert y to 11*167 matrix of 0 and 1
# training_data_y_probability = np.zeros((len(training_data_y), 11, 167))
# for i in range(len(training_data_y)):
#     for j in range(11):
#         index = (int)(training_data_y[i][j])
#         training_data_y_probability[i][j][index] = 1
# validation_data_y_probability = np.zeros((len(validation_data_y), 11, 167))
# for i in range(len(validation_data_y)):
#     for j in range(11):
#         index = (int)(validation_data_y[i][j])
#         validation_data_y_probability[i][j][index] = 1
# training_data_y_probability = training_data_y_probability.reshape((len(training_data_y), 11 * 167))
# validation_data_y_probability = validation_data_y_probability.reshape((len(validation_data_y), 11 * 167))


# ____________________CREATE MODEL____________________
#__________Input__________
input_layer = tf.keras.layers.Input(shape=(2, 11))
embedding_layer = tf.keras.layers.Embedding(167, 11, input_length=2 * 11)(input_layer)
flatten_layer = tf.keras.layers.Flatten()(embedding_layer)

#__________Hidden__________
dense_layer = tf.keras.layers.Dense(11 * 167, activation='softmax')(flatten_layer)

#__________Output__________
# output layer that maps to 11*167 matrix
reshape_output = tf.keras.layers.Reshape((11, 167))(dense_layer)

model = tf.keras.Model(inputs=input_layer, outputs=reshape_output)

# ____________________TRAIN MODEL____________________
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
model.fit(training_data_x, training_data_y, epochs=1, validation_data=(validation_data_x, validation_data_y))
model.evaluate(validation_data_x, validation_data_y)


# ____________________MAKE PREDICTIONS____________________
# [[200.  81. 110. 523. 429.  60. 875.  41.  21. 154. 157.] <<<<<<<in team
#  [100. 523. 412. 429.  80.  58. 111. 142. 236.  78.  98.]] <<<<<<<in enemy team
# [200.  81. 110. 523. 429.  60. 875.  41.  21. 154. 157.] <<<<<<<out 

test_data = np.zeros((1, 2, 11))
test_data[0][0] = [200, 81, 110, 523, 429, 60, 875, 41, 21, 154, 157]
test_data[0][1] = [100, 523, 412, 429, 80, 58, 111, 142, 236, 78, 98]

# map test data to champion id <<<< THIS IS CRUCIAL, THIS IS THE PROPER INPUT FORMAT!!!!!!!!!!!!!!!!!!!!!!!
for i in range(2):
    for j in range(11):
        test_data[0][i][j] = champions.index((int)(test_data[0][i][j]))
predictions = model.predict(test_data)
# print(predictions)
predictions = probability_reader(predictions, champions)
print(predictions)
model.save('model.h5')

# ____________________CONTINUE TRAINING____________________
saveNum = 1
while True:
    # # Step 9: Load the model
    model = tf.keras.models.load_model('model.h5')
    # continue training
    model.fit(training_data_x, training_data_y, epochs=100, batch_size=256, validation_data=(validation_data_x, validation_data_y))
    # # Step 10: Evaluate the model
    model.evaluate(validation_data_x, validation_data_y)
    # # Step 11: Save the model
    model.save('model + ' + str(saveNum) + '.h5')
    saveNum += 1


