import pickle
import pandas as pd
import numpy as np


outputFile = open('data\\match_data_version1_processed.pickle', 'wb')


# WINNERS
path = 'data\\match_winner_data_version1.pickle'
with open(path, 'rb') as f:
    data = pickle.load(f)
path = 'data\\match_loser_data_version1.pickle'
with open(path, 'rb') as f:
    dataL = pickle.load(f)
path = 'data\\match_data_version1.pickle'
with open(path, 'rb') as f:
    dataM = pickle.load(f)


for i in range(len(data)):
    winners = []
    losers = []
    match = []

    # WINNERS_____________________________________________________
    winners.append(data['teamId'][i])
    bans = data['bans'][i]
    winners.append("bans")
    for ban in bans:
        winners.append(ban['championId'])
    game_id = data['gameId'][i]
    match.append(game_id)
    # ____________________________________________________________

    # LOSERS______________________________________________________
    # find the row with game_id
    rowL = dataL[dataL['gameId'] == game_id]
    losers.append(rowL['teamId'].values[0])
    bans = rowL['bans'].values[0]
    losers.append("bans")
    for ban in bans:
        losers.append(ban['championId'])
    # ____________________________________________________________
    
    # MATCH_______________________________________________________
    # find the row with game_id
    rowM = dataM[dataM['gameId'] == game_id]
    winners.append("champs")
    losers.append("champs")
    try:
        for participant in rowM['participants'][i]:
            if participant['teamId'] == winners[0]:
                winners.append(participant['championId'])
            else:
                losers.append(participant['championId'])
    except:
        try:
            for participant in rowM['participants'][0]:
                if participant['teamId'] == winners[0]:
                    winners.append(participant['championId'])
                else:
                    losers.append(participant['championId']) 
        except:
            print("error")

    match.append(winners)
    match.append(losers)
    if (len(match) == 3 and len(match[1]) == 13 and len(match[2]) == 13):
        print(str(i) + " " + str(match))
        pickle.dump(match, outputFile)


# 4227460496.