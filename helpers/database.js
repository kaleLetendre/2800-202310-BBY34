const banProperties = ['ban1', 'ban2', 'ban3', 'ban4', 'ban5', 'ban6', 'ban7', 'ban8', 'ban9', 'ban10'];

function champImage(champion) {
  return `http://ddragon.leagueoflegends.com/cdn/13.9.1/img/champion/${champion}.png`
}

const getTeamChamps = (dbRet) => {
  return [
    dbRet[0].champ1,
    dbRet[0].champ2,
    dbRet[0].champ3,
    dbRet[0].champ4,
    dbRet[0].champ5
  ];
}

const getEnemyChamps = (dbRet) => {
  return [
    dbRet[0].enemy1,
    dbRet[0].enemy2,
    dbRet[0].enemy3,
    dbRet[0].enemy4,
    dbRet[0].enemy5
  ];
}

const getBans = (dbRet) => {
  const bans = [];
  
  banProperties.forEach(property => {
    const champ = dbRet[0][property];
    bans.push(champ);
  });
  
  return bans;
}


function generateTeamChamps(dbRet) {
  const teamChamps = [];
  const champs = getTeamChamps(dbRet);
  
  champs.forEach(champ => {
    const champImg = champImage(champ);
    teamChamps.push([champ, champImg]);
  });
  
  return teamChamps;
}

function generateEnemyChamps(dbRet) {
  const enemyChamps = [];
  const champs = getEnemyChamps(dbRet);
  
  champs.forEach(champ => {
    const champImg = champImage(champ);
    enemyChamps.push([champ, champImg]);
  });
  
  return enemyChamps;
}

function generateBans(dbRet) {
  const bans = [];
  
  banProperties.forEach(property => {
    const champ = dbRet[0][property];
    const champImg = champImage(champ);
    bans.push([champ, champImg]);
  });
  
  return bans;
}

const convertUserTeam = (dbRet) => {
  return (dbRet[0].userTeam == 'blue') ? 100 : 200;
}

const convertBlankToZero = (champ) => {
  return champ == 'blank' ? 0 : champ;
}

function formatQuestion(dbRet) {
  var result = [[],[]];
  var teamChamps = getTeamChamps(dbRet);
  var enemyChamps = getEnemyChamps(dbRet);
  var bans = getBans(dbRet);
  var userTeamNum = convertUserTeam(dbRet);
  var enemyTeamNum = (userTeamNum == 100) ? 200 : 100;

  result[0].push(userTeamNum);
  result[1].push(enemyTeamNum);

  teamChamps.forEach(champ => {
    result[0].push(convertBlankToZero(champ));
  });
  enemyChamps.forEach(champ => {
    result[1].push(convertBlankToZero(champ));
  });

  if (userTeamNum == 100) {
    for (let i = 0; i < 5; i++) {
      result[0].push(convertBlankToZero(bans[i]));
      result[1].push(convertBlankToZero(bans[i+5]));
    }
  } else {
    for (let i = 0; i < 5; i++) {
      result[0].push(convertBlankToZero(bans[i + 5]));
      result[1].push(convertBlankToZero(bans[i]));
    }
  }
  // load champions.json
  const champions = require('../champions.json');
  // console.log(champions);

  // use champions.json to get champion ids
  for (let i = 0; i < result[0].length; i++) {
  //   check if type is string
    if (typeof result[0][i] == 'string') {
      for (let j = 0; j < champions.length; j++) {
        if (result[0][i] == champions[j][0]) {
          result[0][i] = champions[j][2];
          console.log(result[0][i]);
        }
      }
    }
  }
  for (let i = 0; i < result[1].length; i++) {
    //   check if type is string
    if (typeof result[1][i] == 'string') {
      for (let j = 0; j < champions.length; j++) {
        if (result[1][i] == champions[j][0]) {
          result[1][i] = champions[j][2];
        }
      }
    }
  }



  return result;
}

module.exports = {
  generateTeamChamps,
  generateEnemyChamps,
  generateBans,
  champImage,
  formatQuestion
};