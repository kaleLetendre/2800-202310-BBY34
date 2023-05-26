import tensorflow as tf
import numpy as np

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

champions = read_champions('data/champions.txt')
champions.append(-1)#null
champions.append(100)#1st team
champions.append(200)#2nd team
champions.append(0)#not selected

# load model
model = tf.keras.models.load_model('modles/modle0.h5')

# make prediction

test_data = np.zeros((1, 2, 11))
test_data[0][0] = [200, 81, 110, 523, 429, 60, 875, 41, 21, 154, 157]
test_data[0][1] = [100, 523, 412, 429, 80, 58, 111, 142, 236, 78, 98]
# [200.  81. 110. 523. 429.  60. 875.  41.  21. 154. 157.] <<<<<<< goal output

# map test data to champion id <<<< THIS IS CRUCIAL, THIS IS THE PROPER INPUT FORMAT!!!!!!!!!!!!!!!!!!!!!!!
for i in range(2):
    for j in range(11):
        test_data[0][i][j] = champions.index((int)(test_data[0][i][j]))
predictions = model.predict(test_data)
# print(predictions)
predictions = probability_reader(predictions, champions)
print(predictions)
