const { connectedUsersMap } = require("../user.management.cjs"); // Update the path

exports.hasUsernameBeenTaken = (req, res) => {
  try {
    console.log(req.params);

    const { userName } = req.body;

    if (connectedUsersMap.has(userName)) {
      res.status(409).send("Username already taken");

      return;
    }

    res.status(200).send("OK !");
  } catch (error) {
    res
      .status(500)
      .send("An unexpected error has occurred: " + error.toString());
  }
};
