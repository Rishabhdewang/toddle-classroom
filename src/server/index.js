const express = require("express");
const mw = require("../commons/middleware");
const app = express();
const dao = require("./dao");

app.post(
  "/create-assignment",
  mw.authenticate,
  mw.authorize(["TUTOR"]),
  dao.createAssignment
);

app.put(
  "/update-assignment/:id",
  mw.authenticate,
  mw.authorize(["TUTOR"]),
  dao.updateAssignment
);

app.put(
  "/delete-assignment/:id",
  mw.authenticate,
  mw.authorize(["TUTOR"]),
  dao.deleteAssignment
);

//BOTH

app.get(
  "/assignment-details/:id",
  mw.authenticate,
  mw.authorize(["STUDENT", "TUTOR"]),
  dao.getAssignment
);

app.get(
  "/assignment-feed",
  mw.authenticate,
  mw.authorize(["STUDENT", "TUTOR"]),
  dao.assignmentFeed
);

//Student
app.put(
  "/submit-assignment",
  mw.authenticate,
  mw.authorize(["STUDENT"]),
  dao.submitAssignment
);

module.exports = app;
