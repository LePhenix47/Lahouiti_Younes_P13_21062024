exports.test = (req, res) => {
  console.log(req.params);

  res.status(200).send("NodeJS server TEST endpoint is up and running");
};

exports.testPost = (req, res) => {
  console.log(req.body);
  res.status(200).send({ response: "ok" });
};
