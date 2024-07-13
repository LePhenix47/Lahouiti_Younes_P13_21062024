const fileSystem = require("fs");

exports.test = (req, res) => {
  res.status(200).send("NodeJS server TEST endpoint is up and running");
};
