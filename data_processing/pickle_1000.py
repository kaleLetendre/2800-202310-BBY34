import pickle
import pandas as pd
import numpy as np

path = 'data\\match_data_version1.pickle'
with open(path, 'rb') as f:
    data = pickle.load(f)

# save first 1000 rows of data as a new pickle file
data_1000 = data.iloc[:1000, :]
path_1000 = 'data\\match_data_1000.pickle'
with open(path_1000, 'wb') as f:
    pickle.dump(data_1000, f)
    