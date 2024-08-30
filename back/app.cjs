const express = require("express");
const app = express();
const testRoutes = require("./src/routes/test.route.cjs");
const checkUserNameRoutes = require("./src/routes/check-username.route.cjs");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/test", testRoutes);
app.use("/api/check-username", checkUserNameRoutes);

module.exports = app;
