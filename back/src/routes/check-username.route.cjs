const express = require("express");
const router = express.Router();

const checkUserNameControllers = require("../controllers/check-username.controller.cjs");

const { hasUsernameBeenTaken } = checkUserNameControllers;

router.post("/", hasUsernameBeenTaken);

module.exports = router;
