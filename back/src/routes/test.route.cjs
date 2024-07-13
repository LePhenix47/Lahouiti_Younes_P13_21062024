const express = require("express");
const router = express.Router();

const testController = require("../controllers/test.controller.cjs");

const { test } = testController;

router.get("/", test);

module.exports = router;
