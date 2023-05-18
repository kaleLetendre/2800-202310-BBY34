require("./utils.js");
require("dotenv").config();

const axios = require('axios');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");
const { undefined } = require("webidl-conversions");
const { render } = require("ejs");

const expireTime =24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");
const teamsCollection = database.db(mongodb_database).collection("teams");
const passResetCollection = database.db(mongodb_database).collection('passwordResetRequests');
passResetCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })


app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
// console.log(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`);

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

var logo = "logo.jpg";

/* Home */
app.get("/", (req, res) => {
    req.session.teamCode = 0;
    res.render('home');
});

app.get("/createUser", (req, res) => {
  res.render("createUser");
});

app.get("/login", (req, res) => {
  var code = req.query.teamCode
  if(code != null)
  res.render('login', {teamCode: req.query.teamCode});
  else res.render('login', {teamCode: 0});
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

  if(dbRet != null) {   
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
    user_type: "basic"
  });

  req.session.email = email;
  req.session.authenticated = true;
  req.session.guest = false;
  // console.log("Inserted user");
  if(req.session.teamCode == 0){
    res.redirect("/in");}
    else {res.redirect(`/teamView?team=${req.session.teamCode}`)}
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
    .project({ username: 1, password: 1, _id: 1, user_type: 1, email: 1 })
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
    teamCode = req.session.teamCode;
    if(teamCode == 0)
    res.redirect("/in");
    else res.redirect(`/teamView?team=${teamCode}`)
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

  const result = await userCollection.find({email: email}).project({email: 1}).toArray();

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
  
  transporter.sendMail(mailOptions, function(error, info){
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
  const resetRequest = await passResetCollection.find({token: token}).project({token: 1, email: 1}).toArray();

  
  if (resetRequest.length !== 1) {
    res.render('message', {title: 'Token has expired', message: 'Sorry, password reset token has expired. Please try again.', route: '/'});
    return;
  }

  res.render('resetPassword', {token: token, email: resetRequest[0].email, isValid: isValid});
});

/* handles resetting password */
app.post('/resettingPassword', async (req,res) => {
  // check if password same
  const { token, email, password, confirmPassword } = req.body;
  
  if (password !== confirmPassword) {
    return res.redirect(`/reset-password?token=${token}&isValid=false`);
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await userCollection.updateOne({email: email}, {$set: {
    password: hashedPassword
  }});

  // remove token
  const tokenResult = await passResetCollection.deleteOne({token: token});

  // update
  if (result.modifiedCount === 1) {
    // success
    res.redirect('/password-reset-success');
  } else {
    // failure
    res.redirect('/password-reset-failure');
  }
})

// app.get("/loggedin", async (req, res) => {
//   if (!req.session.authenticated || req.session.guest) {
//     res.redirect("/login");
//   }

//   console.log("Inserted session");

//   if (req.session.user_type == "admin"){
//     res.render("adminloggedin");
//   } else {
//     res.render("loggedIn");
//   }
// });

app.get("/logout", async (req, res) => {
  console.log("removing session from db");
  req.session.destroy();
  res.render("loggedOut");
});

//fix this
app.get("/in", async (req, res) => {
  if (!req.session.authenticated || req.session.guest) {
	console.log("You're not supposed to be here yet")
    res.redirect("/");
  } else {
    const email = req.session.email;
    const result = await userCollection
      .find({ email })
      .project({ username: 1 })
      .toArray();
    const username = result[0].username;
    res.render("in", {name: username, image: logo})
  }
});

app.get("/nope", (req, res) => {
  res.status(403);
  res.render("nope");
})

app.get("/findTeam", (req, res) => {
  res.render("findTeam");
})

app.get("/createTeam", (req, res) => {
  res.render("createTeam");
})

app.post("/submitTeam", async (req, res) => {
  var teamCode = genCode(10);
  req.session.teamCode = teamCode;
  await teamsCollection.insertOne({
    teamName: req.body.teamName,
    code: teamCode,
    champ1: "this",
    champ2: "is",
    champ3: "a",
    champ4: "test",
    champ5: "!"
  });
  res.redirect(`/teamView?team=${teamCode}&name=${req.body.teamName}`)
})

app.post("/joinTeam", async (req, res) => {
  dbRet = await teamsCollection
  .find({ code: req.body.teamCode})
  .project({}).toArray();
  if(dbRet[0] == null) {
    res.render("cantFindTeam");
  } 
  else {
    console.log(dbRet[0].teamName);
    req.session.teamCode = req.body.teamCode
    res.redirect(`/teamView?&name=${dbRet[0].teamName}`);
  }
})

app.get("/linkJoin", (req, res) => {
  req.session.teamCode = req.query.teamCode;
  res.render("linkJoin", {friend: req.query.friend, teamName: req.query.name, teamCode: req.query.teamCode})
})

app.get("/guestJoin",(req, res) => {
  req.session.authenticated = true;
  req.session.username = "Poro " + genCode(3);
  req.session.guest = true;
  console.log(req.session.username);
  res.redirect(`/teamView?team=${req.session.teamName}`)
})

app.get("/teamView", async (req, res) => {
  // temp
  const roles = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
  const summonerNames = ['AAAAAAAA', 'BBBBBBB','CCCCCC','DDDDDDD', 'EEEEEEE']
  // 
  const myFunction = () => {
    console.log('hi');
  }

  if(!req.session.authenticated || req.session.teamCode == 0){
    res.redirect("nope");
  } else{
    console.log(req.session.username);
  dbRet = await teamsCollection
  .find({ code: req.session.teamCode})
  .project({}).toArray();

  res.render("teamView", {teamCode: req.session.teamCode, teamName: dbRet[0].teamName, username: req.session.username, url: process.env.URL,
  champ1: dbRet[0].champ1,
  champ2: dbRet[0].champ2,
  champ3: dbRet[0].champ3,
  champ4: dbRet[0].champ4,
  champ5: dbRet[0].champ5,
  roles: roles,
  summonerNames: summonerNames,
  myFunction: myFunction
})}
})

/**
 * Project routes
 */
app.get('/profile', async (req,res) => {
  // session check 
  if (!req.session.authenticated || req.session.guest) {
    res.redirect("/nope");
  } else {
      // make request db for personal info
    const result = await userCollection
    .find({ email: req.session.email })
    .project({ email: 1, password: 1, username: 1, summonerName: 1 })
    .toArray();
    // populate profile page

    // render
    res.render('profile', {
      username: result[0].username,
      password: result[0].password,
      email: result[0].email,
      summonerName: result[0].summonerName
    });
  }
});

app.get("/email-not-found", (req,res) => {
  res.render("message", {title: 'Email Not Found', message: "Sorry the inputted email can\'t be found. Please try again.", route: "/forgotPass"})
});

app.get("/invalid-email-error", (req,res)=> {
  res.render("message", {title: `Email Invalid`, message: "Improper email. Please try again.", route: "/forgotPass"});
});

app.get("/password-reset-success", (req,res) => {
  res.render("message", {title: 'Password Reset Sucessfully', message: "Password has successfully reset. You can now use your new password to log in.", route: "/"});
});

app.get("/password-reset-failure", (req,res) => {
  res.render("message", {title: 'Password Reset Unsucessfully', message: "Password has not been reset. Please contact us for more details.", route: "/"});
});

app.use(express.static(__dirname + "/public"));

//easter egg
var counter = 0;
app.get("/eggCount", (req, res) => {
  counter++;
  if (counter > 4){
    logo = "poro.jpg";
    counter = 0;
  }
  else {
    logo="logo.jpg"
  }
  res.redirect("/in");
})

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

  return code;
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
