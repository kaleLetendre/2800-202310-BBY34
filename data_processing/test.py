# print the firs row of the file
import pandas as pd
# load part of the data into a DataFrame
df = pd.read_csv('data/match_data_version1.csv')
# print the first entry of the column called 'participants'
games = df['participants']
output = games[0].split(",")
for i in range(0, len(output)):
    if "championId" in output[i]:
        print(output[i])
        
        




