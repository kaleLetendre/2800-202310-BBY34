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

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
console.log(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`);
var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store
    saveUninitialized: false,
    resave: true,
  })
);

app.get("/", (req, res) => {
  
    res.render('home');
});

app.get("/nosql-injection", async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.send(
      `<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`
    );
    return;
  }
  console.log("user: " + username);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  //If we didn't use Joi to validate and check for a valid URL parameter below
  // we could run our userCollection.find and it would be possible to attack.
  // A URL parameter of user[$ne]=name would get executed as a MongoDB command
  // and may result in revealing information about all users or a successful
  // login without knowing the correct password.
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.send(
      "<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>"
    );
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);

  res.send(`<h1>Hello ${username}</h1>`);
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

  const schema = Joi.object({
    email: Joi.string().max(20).required(),
    username: Joi.string().max(20).required(),
    password: Joi.string().max(20).required(),
  });

  const validationResult = schema.validate({ email, username, password });
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/createUser");
    return;
  }
  var dbRet = await userCollection
  .find({ email: email })
  .project({ email: 1});
  if(dbRet != null){
    
	res.render("dupEmail");
  } else {

	dbRet = await userCollection
  .find({ username: username })
  .project({ username: 1});
  if(dbRet != null){
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
  console.log("Inserted user");
  res.render("loggedIn");
});

app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  console.log(req.session);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(email);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1, user_type: 1 })
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
    req.session.email = email;
    req.session.user_type = result[0].user_type;
    console.log(req.session.user_type);
    req.session.cookie.maxAge = expireTime;

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
})

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

  if(req.session.user_type == "admin"){
    res.render("adminloggedin");
  }
  else {
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

app.get("/admin", async (req, res) => {
  if (!req.session.authenticated) {
    console.log("You're not supposed to be here yet")
      res.redirect("/");
    } else if(req.session.user_type != "admin"){
      res.redirect("/nope");
    }
  const dbRet = await userCollection.find().project({username: 1, _id: 1, user_type: 1}).toArray();
  res.render("admin", {users: dbRet});
})

app.get("/nope", (req, res) => {
  res.status(403);
  res.render("nope");
})

function randomImage(){
	const images = ['HappyOtter.jpg', 'AngryOtter.jpg', 'dog.jpg'];

	// Generate a random number between 0 and 2
	const randomIndex = Math.floor(Math.random() * 3);
  
	// Return the image file name at the random index
	return images[randomIndex];
}

app.get("/updateAdmin", async (req, res) => {
  userCollection.updateOne({username: req.query.user}, {$set: {user_type: "admin"}});
  res.redirect("/admin");
})

app.get("/updateBasic", async (req, res) => {
  userCollection.updateOne({username: req.query.user}, {$set: {user_type: "basic"}});
  res.redirect("/admin");
})

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});


app.listen(port, () => {
  console.log("Node application listening on port " + port);
}); 
