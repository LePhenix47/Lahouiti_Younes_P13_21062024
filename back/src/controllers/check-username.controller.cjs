const { connectedUsersMap } = require("../user.management.cjs"); // Update the path

exports.hasUsernameBeenTaken = (req, res) => {
  try {
    const { userName } = req.body;

    if (!req.body || !userName) {
      res.status(400).send("Bad request, invalid body or username");
      console.error("Invalid body or username");

      return;
    }

    if (connectedUsersMap.has(userName)) {
      res.status(409).send("Username already taken");
      console.error(userName, "is already taken");

      return;
    }

    res.status(200).send("OK !");
  } catch (error) {
    res
      .status(500)
      .send("An unexpected error has occurred: " + error.toString());

    console.error("Unexpected error", error.toString());
  }
};
