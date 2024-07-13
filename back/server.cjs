const app = require("./app.cjs");
//Initializes the Back-end server in HTTPS to avoid MITM attacks
const https = require("https");
const fileSystem = require("fs");
const socketio = require("socket.io");

const chatSocketListener = require("./src/websockets/chat.websockets.cjs");
const testSocketListener = require("./src/websockets/test.websockets.cjs");
const webRtcSocketListener = require("./src/websockets/web-rtc.websockets.cjs");

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
const errorSocketListener = (error) => {
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

server.on("error", errorSocketListener);

server.on("listening", () => {
  const address = server.address();
  const bind = typeof address === "string" ? "pipe " + address : "port " + port;
  console.log("Listening on " + bind);
});

server.listen(port);

const offers = [
  // offererUserName
  // offer
  // offerIceCandidates
  // answererUserName
  // answer
  // answererIceCandidates
];
const connectedSockets = [
  //username, socketId
];

const io = socketio(server, {
  cors: {
    origin: [
      "https://localhost:3001",
      `https://${process.env.LOCAL_IP}`, //if using a phone or another computer
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  chatSocketListener(io, socket);
  testSocketListener(io, socket);
  webRtcSocketListener(io, socket);
  const userName = socket.handshake.auth.userName;
  socket.emit("connected", userName);
  console.log("A user connected to the WS", userName);
});

io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});
