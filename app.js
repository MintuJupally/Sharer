const path = require("path");
const express = require("express");
const { v4: uuidV4 } = require("uuid");

const cors = require("cors");
const helmet = require("helmet");

const requestLogger = require("./utils/requestLogger");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

console.log("hey");

app.use(cors());

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(express.static(path.join(__dirname, "client/build")));

app.use(requestLogger);

app.get("/api/call", (req, res) => {
  const roomId = uuidV4();
  console.log(roomId);
  res.send(roomId);
});

app.get("/", (req, res, next) => {
  res.sendFile(path.join(__dirname, "/client/build/index.html"));
});

// app.all("*", (req, res, next) => {
//   console.log("hello");
//   // next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// app.use(globalErrorHandler);

module.exports = app;
