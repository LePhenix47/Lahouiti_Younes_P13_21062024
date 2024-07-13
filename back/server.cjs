const app = require("./app.cjs");
//Initializes the Back-end server in HTTPS to avoid MITM attacks
const https = require("https");
const fileSystem = require("fs");

const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
};

const port = normalizePort(process.env.PORT || 3000);

app.set("port", port);

/**
 * Handles errors that occur during the execution of the server.
 *
 * @param {Error} error - The error object.
 * @return {void} This function does not return a value.
 */
const errorHandler = (error) => {
  if (error.sycall !== "listen") {
    throw error;
  }
  const address = server.address();
  const bind = typeof address === "string" ? "pipe" + address : "port" + port;

  switch (error.code) {
    case "EACCESS": {
      console.error(bind + " requires elevated privileges (i.e Admin)");
      process.exit(1);
    }

    case "EAADDRINUSE": {
      console.error(bind + " is already in use");
      process.exit(1);
    }
    default:
      throw error;
  }
};

const key = fileSystem.readFileSync("./certificates/cert.key");
const cert = fileSystem.readFileSync("./certificates/cert.crt");

const options = { key, cert };

const server = https.createServer(options, app);

server.on("error", errorHandler);

server.on("listening", () => {
  const address = server.address();
  const bind = typeof address === "string" ? "pipe " + address : "port " + port;
  console.log("Listening on " + bind);
});

server.listen(port);
