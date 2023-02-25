const express = require("express");
const auth = require("./auth")
const server = require("./server")

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


//starting the server
app.listen(3000, () => {
  console.log("server started at 3000");
});

app.use("/auth",auth);
app.use("/api",server);

app.get("/ping", (req, res) => res.end("pong"));
