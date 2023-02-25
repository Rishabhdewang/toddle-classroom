const db = require("../commons/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ACCESS_SECRET_KEY = "toddle";

async function accessTokenGenerator(user) {
  let obj = {
    id: user.id,
    username: user.username,
    type: user.type,
  };
  return await jwt.sign(obj, ACCESS_SECRET_KEY, {
    expiresIn: "1d",
  });
}

const signUp = async (request, response) => {
  try {
    let { username, password, type } = request.body;

    const user = await db.oneOrNone(
      `SELECT * FROM users where username = $(username)`,
      { username }
    );
    if (user) return response.status(400).send("Username already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    let res = await db.one(
      "INSERT INTO users(username, password, type) values ($1, $2, $3) returning *",
      [username, hashedPassword, type]
    );

    response.status(200).send("Added Successfully");
  } catch (e) {
    console.log("error", e);
    response.status(500).send(e);
  }
};

const login = async (req, res) => {
  try {
    let { username, password } = req.body;

    const user = await db.oneOrNone(
      `SELECT * FROM users where username = $(username)`,
      {
        username,
      }
    );
    if (user === null) return res.status(400).send("unable to find user");
    if (await bcrypt.compare(password, user.password)) {
      const ACCESS_TOKEN = await accessTokenGenerator(user);
      return res.json({
        ...user,
        "access token": ACCESS_TOKEN,
      });
    } else {
      return res.send("incorrect password");
    }
  } catch (e) {
    console.log(e);
    res.status(500).send("Something went wrong");
  }
};

module.exports = { signUp, login };
