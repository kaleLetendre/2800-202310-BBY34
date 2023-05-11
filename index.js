require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");
const { undefined } = require("webidl-conversions");

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

/* Home */
app.get("/", (req, res) => {
  
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

  const validationResult = schema.validate({ email, username, password, sumname });
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/createUser");
    return;
  }
  var dbRet = await userCollection
    .find({ email: email })
    .project({ email: 1});

  if(dbRet != null) {   
	  res.render("dupEmail");
  } else {
    dbRet = await userCollection
      .find({ username: username })
      .project({ username: 1});
  if (dbRet != null) {
    res.render("dupUser");
  }
}

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  await userCollection.insertOne({
    email: email,
    username: username,
    password: hashedPassword,
    user_type: "basic"
  });

  req.session.email = email;
  req.session.authenticated = true;
  // console.log("Inserted user");
  res.render("loggedIn");
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

    res.redirect("/loggedIn");
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

app.get("/getPass", async (req, res) => {
  var email = req.body.email;

})

app.get("/loggedin", async (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
  }

  console.log("Inserted session");

  if (req.session.user_type == "admin"){
    res.render("adminloggedin");
  } else {
    res.render("loggedIn");
  }
});

app.get("/logout", async (req, res) => {
  console.log("removing session from db");
  req.session.destroy();
  res.render("loggedOut");
});

//fix this
app.get("/in", async (req, res) => {
  if (!req.session.authenticated) {
	console.log("You're not supposed to be here yet")
    res.redirect("/");
  } else {
    const email = req.session.email;
    const result = await userCollection
      .find({ email })
      .project({ username: 1 })
      .toArray();
    const username = result[0].username;
    res.render("in", {name: username})
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
  await teamsCollection.insertOne({
    teamName: req.body.teamName,
    code: teamCode,
    champ1: null,
    champ2: null,
    champ3: null,
    champ4: null,
    champ5: null
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
    res.redirect(`/teamView?team=${teamCode}&name=${dbRet[0].teamName}`);
  }
})

app.get("/teamView", (req, res) => {
  res.render("teamView", {teamCode: req.query.team, teamName: req.query.name})
})

/**
 * Project routes
 */
app.get('/profile', async (req,res) => {
  // session check 
  if (!req.session.authenticated) {
    res.redirect("/");
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


app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});


function genCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }

  return code;
}



app.listen(port, () => {
  console.log("Node application listening on port " + port);
}); 
