const express = require("express");
const app = express();
const dao = require('./dao')

app.post('/signup', dao.signUp);
app.post('/login', dao.login);


module.exports= app;

