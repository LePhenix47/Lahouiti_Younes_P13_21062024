const app = require("./app.cjs");
//Initializes the Back-end server in HTTPS to avoid MITM attacks
const https = require("https");
const fileSystem = require("fs");
const socketio = require("socket.io");

const chatSocketListener = require("./src/websockets/chat.websockets.cjs");
const testSocketListener = require("./src/websockets/test.websockets.cjs");
const webRtcSocketListener = require("./src/websockets/web-rtc.websockets.cjs");

const { connectedUsersMap, roomsMap } = require("./src/user.management.cjs");
const { getRoomsArrayFromMap } = require("./src/utils/map.utils.cjs");

const normalizePort = (val) => {
  const port = Number(val);
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
    throw new Error(error);
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
      throw new Error(error);
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

const io = socketio(server, {
  cors: {
    origin: [
      "http://localhost:4200",
      "https://localhost:4200",
      `http://${process.env.LOCAL_IP}`, //if using a phone or another computer
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  testSocketListener(io, socket);

  chatSocketListener(io, socket, connectedUsersMap);
  webRtcSocketListener(io, socket, connectedUsersMap, roomsMap);
  const { userName } = socket.handshake.auth;
  console.log(
    "A user connected to the WS, with username from handshake: ",
    userName
  );

  io.emit(
    "room-list",
    Array.from(roomsMap.entries()).map(
      ([creator, [creatorName, joinerName]]) => {
        return {
          roomName: creatorName,
          isFull: joinerName !== null, // * The room is full if there's a joiner
        };
      }
    )
  );

  socket.on("disconnect", () => {
    // Additional logic for cleanup or logging goes here

    // Get the room name the user is in
    console.log("User disconnected: ", userName, connectedUsersMap, roomsMap);

    const roomName =
      roomsMap.get(userName) || connectedUsersMap.get(userName)?.joinedRoom;

    if (roomName) {
      console.log("User disconnected and deleted room", { roomName });

      // ? Regardless if the user was the creator or joiner of the room, we'll still delete it
      socket.to(roomName).emit("room-deleted", { roomName, userName });
    }

    connectedUsersMap.delete(userName);
    roomsMap.delete(userName);
    io.emit("room-list", getRoomsArrayFromMap(roomsMap));
    console.log(`User disconnected: ${socket.id}`, connectedUsersMap, roomsMap);
  });
});

io.engine.on("connection_error", (err) => {
  console.group("Connection error");
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
  console.groupEnd();
});
