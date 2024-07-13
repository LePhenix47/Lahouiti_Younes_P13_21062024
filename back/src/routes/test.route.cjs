const express = require("express");
const router = express.Router();

const testController = require("../controllers/test.controller.cjs");

const { test, testPost } = testController;

router.get("/", test);
router.post("/", testPost);

module.exports = router;
