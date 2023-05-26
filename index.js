// External dependencies
require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const fetch = require('isomorphic-fetch');

// Internal dependencies
const { undefined } = require("webidl-conversions");
const { render } = require("ejs");
require("./utils.js");
const { generateTeamChamps, generateEnemyChamps, generateBans, champImage, formatQuestion } = require('./helpers/database.js');

// AI
const tf = require("@tensorflow/tfjs-node");
const ask = require("./AI.js");

// Constants
const saltRounds = 12;
const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

// Express App Configuration
const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

// Database Connection
var { database } = include("databaseConnection");
const userCollection = database.db(mongodb_database).collection("users");
const teamsCollection = database.db(mongodb_database).collection("teams");
const passResetCollection = database.db(mongodb_database).collection('passwordResetRequests');
passResetCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })

// Session Configuration
var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

// Other Variables
var logo = "logo.jpg";

/* Home */
app.get("/", (req, res) => {
  req.session.teamCode = null;
  res.render('home');
});

app.get("/createUser", (req, res) => {
  res.render("createUser");
});

app.get("/login", (req, res) => {
  res.render('login');
});

app.post("/submitUser", async (req, res) => {
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.password;
  var sumname = req.body.sumname;

  const schema = Joi.object({
    email: Joi.string().max(30).required(),
    username: Joi.string().max(20).required(),
    password: Joi.string().max(20).required(),
    sumname: Joi.string().max(30).required(),
  });


  var dbRet = await userCollection.findOne({ email: email }, { projection: { email: 1 } });

  if (dbRet != null) {
    res.render("dupEmail");
    return;
  } else {
    dbRet = await userCollection.findOne({ username: username }, { projection: { username: 1 } });
    if (dbRet != null) {
      res.render("dupUser");
      return;
    }

    const validationResult = schema.validate({ email, username, password, sumname });
    if (validationResult.error != null) {
      console.log(validationResult.error);
      res.redirect("/createUser");
      return;
    }
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  await userCollection.insertOne({
    email: email,
    username: username,
    password: hashedPassword,
    summonerName: sumname,
    pick1: "blank",
    pick2: "blank",
    pick3: "blank"
  });

  req.session.username = username;
  req.session.email = email;
  req.session.authenticated = true;
  req.session.guest = false;
  req.session.pick1 = "blank";
  req.session.pick2 = "blank";
  req.session.pick3 = "blank";

  if (req.session.teamCode == null) {
    res.redirect("/in");
  }
  else { res.redirect(`/teamView`) }
  return;
});

app.post("/loggingin", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  console.log(req.session);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({})
    .toArray();

  console.log(result);
  if (result.length != 1) {
    console.log("user not found");
    res.redirect("/incorrect");
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.cookie.maxAge = expireTime;
    req.session.email = result[0].email;
    req.session.username = result[0].username;
    req.session.guest = false;
    req.session.pick1 = result[0].pick1;
    req.session.pick2 = result[0].pick2;
    req.session.pick3 = result[0].pick3;
    if (req.session.teamCode == null)
      res.redirect("/in");
    else res.redirect(`/teamView`)
    return;
  } else {
    console.log("incorrect password");
    res.redirect("/incorrect");
    return;
  }
});

app.get("/incorrect", (req, res) => {
  res.render("incorrect");
});

/**
 * Password Recovery
 */
app.get("/forgotPass", (req, res) => {
  res.render("forgotPass");
})

/* Sends email with token to Password Reset */
app.post("/getPass", async (req, res) => {
  var email = req.body.email;
  // validate email, check if exists
  const schema = Joi.string().email().required();
  const validationResult = schema.validate(email);

  if (validationResult.error != null) {
    res.redirect("/invalid-email-error");
    return;
  }

  const result = await userCollection.find({ email: email }).project({ email: 1 }).toArray();

  if (result.length != 1) {
    res.redirect("/email-not-found");
    return;
  }

  // store token in db
  var token = genCode(10);
  await passResetCollection.insertOne({
    token: token,
    email: email,
    createdAt: new Date()
  });

  // take email and send recovery email
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  var mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'SyneRift Password Recovery Request',
    text: emailRecoveryText(token)
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  res.render('recoverPass');
})

/* Reset Password page */
app.get('/reset-password', async (req, res) => {
  const token = req.query.token;
  const isValid = req.query.isValid;
  const resetRequest = await passResetCollection.find({ token: token }).project({ token: 1, email: 1 }).toArray();


  if (resetRequest.length !== 1) {
    res.render('message', { title: 'Token has expired', message: 'Sorry, password reset token has expired. Please try again.', route: '/' });
    return;
  }

  res.render('resetPassword', { token: token, email: resetRequest[0].email, isValid: isValid });
});

/* handles resetting password */
app.post('/resettingPassword', async (req, res) => {
  // check if password same
  const { token, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.redirect(`/reset-password?token=${token}&isValid=false`);
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await userCollection.updateOne({ email: email }, {
    $set: {
      password: hashedPassword
    }
  });

  // remove token
  const tokenResult = await passResetCollection.deleteOne({ token: token });

  // update
  if (result.modifiedCount === 1) {
    // success
    res.redirect('/password-reset-success');
  } else {
    // failure
    res.redirect('/password-reset-failure');
  }
})

/* Logged Out Page */
app.get("/logout", async (req, res) => {
  console.log("removing session from db");
  req.session.destroy();
  res.render("message", { title: 'You\'re Logged Out', message: "You've successfully logged out. Click below to go back to home.", route: "/" })
});

/* Home Page */
app.get("/in", async (req, res) => {
  if (!req.session.authenticated || req.session.guest) {
    console.log("You're not supposed to be here yet")
    res.redirect("/nope");
  } else {
    const email = req.session.email;
    const result = await userCollection
      .find({ email })
      .project({ username: 1 })
      .toArray();
    const username = result[0].username;
    res.render("in", { name: username, image: logo })
  }
});

app.get("/nope", (req, res) => {
  res.status(403);
  res.render("nope");
})

/* Champions picks Page */
app.get("/picks", async (req, res) => {
  var picks = [
    req.session.pick1,
    req.session.pick2,
    req.session.pick3
  ];

  var img = [];
  
  img.push(champImage(req.session.pick1));
  img.push(champImage(req.session.pick2));
  img.push(champImage(req.session.pick3));
  res.render("picks", {champ: picks, img: img});
})

/**
 * Team Paths
 */
app.get("/findTeam", (req, res) => {
  res.render("findTeam");
})

app.get("/createTeam", (req, res) => {
  res.render("createTeam");
})

app.post("/submitTeam", async (req, res) => {
  console.log(req.session.username);
  var teamCode = genCode(10);
  req.session.teamCode = teamCode;
  await teamsCollection.insertOne({
    teamName: req.body.teamName,
    code: teamCode,
    champ1: "blank",
    champ2: "blank",
    champ3: "blank",
    champ4: "blank",
    champ5: "blank",
    enemy1: "blank",
    enemy2: "blank",
    enemy3: "blank",
    enemy4: "blank",
    enemy5: "blank",
    ban1: "blank",
    ban2: "blank",
    ban3: "blank",
    ban4: "blank",
    ban5: "blank",
    ban6: "blank",
    ban7: "blank",
    ban8: "blank",
    ban9: "blank",
    ban10: "blank",
    player1: req.session.username,
    player2: null,
    player3: null,
    player4: null,
    player5: null,
    numPlayers: 1,
    userTeam: req.body.userTeam
  });
  res.redirect(`/teamView`)
})

app.post("/joinTeam", async (req, res) => {
  if (req.session.teamCode == null) {
    req.session.teamCode = req.body.teamCode;
  }
  if (req.session.username == null) {
    req.session.authenticated = true;
    req.session.username = "Poro " + genCode(3);
    req.session.guest = true;
    console.log(req.session.username);
  }
  dbRet = await teamsCollection
    .find({ code: req.session.teamCode })
    .project({})
    .toArray();

  // Check if there was a result found
  if (dbRet[0] == null) {
    res.render("cantFindTeam");
    return; // Return after rendering the view to avoid further execution
  }

  // Check if the player is already in the team
  if (
    dbRet[0].player1 === req.session.username ||
    dbRet[0].player2 === req.session.username ||
    dbRet[0].player3 === req.session.username ||
    dbRet[0].player4 === req.session.username ||
    dbRet[0].player5 === req.session.username
  ) {
    res.redirect("/teamView");
    return; // Return after redirecting to avoid further execution
  }

  // Check if there is room in the team
  if (dbRet[0].numPlayers + 1 < 6) {
    var spot = "player" + (dbRet[0].numPlayers + 1);
    console.log(spot);

    await teamsCollection.updateOne(
      { code: req.session.teamCode },
      {
        $set: {
          [spot]: req.session.username,
          numPlayers: dbRet[0].numPlayers + 1
        }
      }
    );
    res.redirect("/teamView");
  } else {
    //this doesn't exist yet
    res.render("tooManyPlayers");
  }
});

app.get("/linkJoin", (req, res) => {
  req.session.username = null;
  req.session.teamCode = req.query.teamCode;
  res.render("linkJoin", { friend: req.query.friend, teamName: req.query.name })
})

app.get("/guestJoin", (req, res) => {
  req.session.authenticated = true;
  req.session.username = "Poro " + genCode(3);
  req.session.guest = true;
  req.session.pick1 = "blank";
  req.session.pick2 = "blank";
  req.session.pick3 = "blank";
  console.log(req.session.username);
})

app.get("/teamView", async (req, res) => {
  const roles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];

  const champs = champData();
  if(!req.session.authenticated || req.session.teamCode == null) {
    res.redirect("/nope");
  }
  else if(req.session.pick1 == "blank" || req.session.pick2 == "blank" || req.session.pick3 == "blank") {
    res.redirect("/picks")
  }
  else {
    dbRet = await teamsCollection
    .find({ code: req.session.teamCode})
    .project().toArray();

    var teamChamps = generateTeamChamps(dbRet);
    var enemyChamps = generateEnemyChamps(dbRet);
    var bans = generateBans(dbRet);
    var summonerNames = [dbRet[0].player1, dbRet[0].player2, dbRet[0].player3, dbRet[0].player4, dbRet[0].player5];
    var userTeam = dbRet[0].userTeam;

    let prediction = await ask(formatQuestion(dbRet));

    let predictions = prediction.map(string => {
      string ? champImage(string) : null});

    res.render("teamView2", {
      teamCode: req.session.teamCode,
      teamName: dbRet[0].teamName,
      username: req.session.username,
      url: process.env.URL,
      summonerNames: summonerNames,
      roles: roles,
      teamChamps: teamChamps,
      enemyChamps: enemyChamps,
      bans: bans,
      userTeam: userTeam,
      prediction: predictions
    });
  }
})

app.post("/update", async (req, res) => {
  input = req.body.champName;
  target = req.query.tar;
  if(input == null || target == ""){
    console.log("empty");
    res.redirect("/teamView");
    return;
  }
  console.log(input);
  await teamsCollection.updateOne(
    { code: req.session.teamCode },
    { $set: { [target]: input } }
  );

  res.redirect("/teamView");
})

app.post("/updatePicks", async (req, res) => {
  input = req.body.champName;
  target = req.query.tar;
  if(input == null || target == ""){
    res.redirect("/picks");
    return;
  }
  console.log(input);
  req.session[req.query.tar] = input;
  if(!req.session.guest) {
  await userCollection.updateOne(
    { email: req.session.email },
    { $set: { [target]: input } }
  );}
  if(req.session.teamCode != null) {
    res.redirect("/teamView")
  } else {res.redirect("/picks");}
})

app.get("/mod", (req, res) => {
  res.render("mod", { target: req.query.tar });
})

/* Profile Page */
app.get('/profile', async (req, res) => {
  // session check 
  if (!req.session.authenticated || req.session.guest) {
    res.redirect("/nope");
  } else {
    // make request db for personal info
    const result = await userCollection
      .find({ email: req.session.email })
      .project({ email: 1, username: 1, summonerName: 1 })
      .toArray();
    // populate profile page

    // render
    res.render('profile', {
      username: result[0].username,
      email: result[0].email,
      summonerName: result[0].summonerName
    });
  }
});

/**
 * Password Recovery Routes
 */
app.get("/email-not-found", (req, res) => {
  res.render("message", { title: 'Email Not Found', message: "Sorry the inputted email can\'t be found. Please try again.", route: "/forgotPass" })
});

app.get("/invalid-email-error", (req, res) => {
  res.render("message", { title: `Email Invalid`, message: "Improper email. Please try again.", route: "/forgotPass" });
});

app.get("/password-reset-success", (req, res) => {
  res.render("message", { title: 'Password Reset Sucessfully', message: "Password has successfully reset. You can now use your new password to log in.", route: "/" });
});

app.get("/password-reset-failure", (req, res) => {
  res.render("message", { title: 'Password Reset Unsucessfully', message: "Password has not been reset. Please contact us for more details.", route: "/" });
});

//easter egg
var counter = 0;
app.get("/eggCount", (req, res) => {
  counter++;
  if (counter > 4) {
    logo = "poro.jpg";
    counter = 0;
  }
  else {
    logo = "logo.jpg"
  }
  res.redirect("/in");
})

app.get("/aiExample", (req, res) => {
  res.render("aiExample");
});

app.post("/askAI", async (req, res) => {
  // console.log(req.body);
  // log the first value
  // console.log(req.body["row1_input0"]);
  // convet into 2x11 array

  var input = [];
  for (var i = 0; i < 2; i++) {
    input.push([]);
    for (var j = 0; j < 11; j++) {
      input[i].push(0);
      if (req.body["row" + (i + 1) + "_input" + j] != '') {
        //cast to int
        input[i][j] = parseInt(req.body["row" + (i + 1) + "_input" + j]);
      }
    }
  }

  var prediction = await ask(input);
  // console.log(prediction);
});

app.get("*", (req, res) => {
  res.status(404);
  res.render("message", {
    title: `Error 404!`,
    message: `You may have typed something in wrong, just follow the buttons and you'll do fine.`,
    route: '/'
  });
});

/**
 * Helper Functions
 */
function genCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  console.log(code);
  return code;
}

async function champData() {
  try {
    const response = await axios.get('http://ddragon.leagueoflegends.com/cdn/12.6.1/data/en_US/champion.json');
    const champions = response.data.data;
    const champs = {};

    if (champions) {
      for (const champion in champions) {
        const { name } = champions[champion];
        const imageUrl = `http://ddragon.leagueoflegends.com/cdn/13.9.1/img/champion/${champion}.png`;

        champs[champion] = {
          name,
          image: imageUrl
        };
      }
    } else {
      throw new Error('Champion data not found');
    }

    //console.log(champs[0]);
    return champs;
  } catch (error) {
    console.error('Error fetching champions:', error);
  }
}

const emailRecoveryText = (token) => {
  return `Hello,

We received a request to recover your account password. If you did not make this request, please ignore this email.

To reset your password, please follow the link below:

${process.env.URL}/reset-password?token=${token}

If you are unable to click on the link above, please copy and paste it into your web browser's address bar.

Thank you for choosing our service.

Sincerely,

SyneRift Team`}

app.listen(port, () => {
  console.log("Node application listening on port " + port);
}); 