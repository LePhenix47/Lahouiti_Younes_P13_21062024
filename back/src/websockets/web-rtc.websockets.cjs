const { getRoomsArrayFromMap } = require("../utils/map.utils.cjs");

const {
  deleteRoomAndHandleEmissions,
} = require("../utils/web-sockets.utils.cjs");

module.exports = (io, socket, connectedUsersMap, roomsMap) => {
  const { userName } = socket.handshake.auth;
  // Handle a user creating a room
  socket.on("create-room", (roomName) => {
    if (!connectedUsersMap.has(userName)) {
      console.warn(`Username ${userName} is not connected`);
      socket.emit("room-error", {
        message: "Cannot create room because user does not exist",
      });
      return;
    }

    if (!roomName) {
      // Check if the room already exists
      console.warn(`No room name was specified for the user ${userName}`);
      socket.emit("room-error", {
        message: "Cannot create room because the room name was not specified",
      });
      return;
    }

    if (roomsMap.has(roomName) || roomsMap.has(userName)) {
      // Check if the room already exists
      console.warn(`Room ${roomName} already exists`);
      socket.emit("room-error", {
        message: "Cannot create new room because it already exists",
      });
      return;
    }

    // Create the room and store the details
    roomsMap.set(roomName, [userName, null]);
    socket.join(roomName);
    console.log(`Room ${roomName} created by user ${userName} (${socket.id})`);

    // Emit a success message back to the creator and update the room list
    socket.emit("room-created", { roomName });

    const userInfo = connectedUsersMap.get(userName);
    userInfo.joinedRoom = roomName;

    connectedUsersMap.set(userName, userInfo);

    io.emit("room-list", getRoomsArrayFromMap(roomsMap));
  });

  socket.on("room-deleted", (roomName) => {
    if (!roomName) {
      console.warn(`No room name was specified for the user ${userName}`);
      socket.emit("room-error", {
        message: "Cannot delete room because the room name was not specified",
      });

      return;
    }

    if (!roomsMap.has(roomName)) {
      // Check if the room already exists
      console.warn(`Room ${roomName} does not exist`);
      socket.emit("room-error", {
        message: "Cannot delete room because it doesn't exist",
      });
      return;
    }
    console.log("Room to delete: ", roomName);
    deleteRoomAndHandleEmissions(
      io,
      socket,
      null,
      roomsMap,
      roomName,
      userName
    );
  });

  // Handle a user joining a room
  socket.on("join-room", ({ roomName, joinerName }) => {
    // Check if the user is already in a room
    for (const [name, participants] of roomsMap.entries()) {
      if (!participants.includes(userName)) {
        continue;
      }

      console.warn(`User ${userName} is already (in room ${name})`);
      socket.emit("room-error", { message: "You are already in a room" });
      return;
    }

    if (!roomsMap.has(roomName)) {
      console.warn(`Room ${roomName} does not exist`);
      socket.emit("room-error", { message: "Room does not exist" });
      return;
    }

    const room = roomsMap.get(roomName);
    if (room[1] !== null) {
      console.warn(`Room ${roomName} is already full`);
      socket.emit("room-error", { message: "Room is already full" });
      return;
    }

    // Join the room and update the room details
    room[1] = userName;
    roomsMap.set(roomName, room);
    socket.join(roomName);

    const userInfo = connectedUsersMap.get(userName);
    userInfo.joinedRoom = roomName;

    connectedUsersMap.set(userName, userInfo);
    console.log(
      `User ${userName} (${socket.id}) joined room ${roomName}`,
      room,
      roomsMap.get(roomName),
      connectedUsersMap
    );

    // Emit a success message back to the joiner and update the room list
    socket.emit("room-joined", { roomName, joinerName });
    socket.to(roomName).emit("room-joined", { roomName, joinerName });
    io.emit("room-list", getRoomsArrayFromMap(roomsMap));
  });

  // Handle a user leaving a room
  socket.on("leave-room", (roomName) => {
    if (!roomName) {
      console.warn(`Room ${roomName} has a falsy value`);
      socket.emit("room-error", { message: "Room is falsy" });
      return;
    }

    if (!roomsMap.has(roomName)) {
      console.warn(`Room ${roomName} does not exist`);
      socket.emit("room-error", { message: "Room does not exist" });
      return;
    }

    const room = roomsMap.get(roomName);

    const [initiator, receiver] = room;

    if (initiator !== userName && receiver !== userName) {
      console.warn(`User ${userName} is not part of room ${roomName}`, [
        initiator,
        receiver,
      ]);
      socket.emit("room-error", {
        message: "You are not part of this room",
      });

      return;
    }

    // Leave the room and remove it from the map
    socket.leave(roomName);
    roomsMap.delete(roomName);

    const userInfo = connectedUsersMap.get(userName);
    userInfo.joinedRoom = null;

    connectedUsersMap.set(userName, userInfo);
    console.log(`User ${userName} (${socket.id}) left room ${roomName}`);

    // Notify both users that the room is deleted
    socket.to(roomName).emit("room-deleted", { roomName, userName });
    io.emit("room-list", getRoomsArrayFromMap(roomsMap));
  });

  socket.on("wrtc-test", ({ roomName, message }) => {
    console.log(
      `wrtc-test from ${userName.toUpperCase()} (in room ${roomName})`,
      message
    );
    socket.to(roomName).emit("wrtc-test", message);
  });

  socket.on("webrtc-session-start", ({ roomName }) => {
    console.log(
      `webrtc-session-start from ${userName.toUpperCase()} (in room ${roomName})`
    );

    socket.to(roomName).emit("webrtc-session-start");
  });

  socket.on(
    "enabled-local-media",
    ({ roomName, remotePeerHasSharedLocalMedia }) => {
      const { video, audio } = remotePeerHasSharedLocalMedia;

      console.log(
        `enabled-local-media from ${userName.toUpperCase()} (in room ${roomName}), local media shared: {video: ${video}, audio: ${audio}}`
      );

      socket
        .to(roomName)
        .emit("enabled-local-media", remotePeerHasSharedLocalMedia);
    }
  );

  socket.on("toggled-media", ({ roomName, deviceToggles }) => {
    const { video, audio } = deviceToggles;

    console.log(
      `toggled-media from ${userName.toUpperCase()} (in room ${roomName}), remote peer has toggled media: {video: ${video}, audio: ${audio}}`
    );

    socket.to(roomName).emit("toggled-media", deviceToggles);
  });

  socket.on("toggled-screen-share", ({ roomName, isSharingScreen }) => {
    console.log(
      `toggled-screen-share from ${userName.toUpperCase()} (in room ${roomName}), is user sharing screen ? ${
        isSharingScreen ? "yes" : "no"
      }`
    );

    socket.to(roomName).emit("toggled-screen-share", isSharingScreen);
  });

  // Handle an offer event within a room
  socket.on("offer", (data) => {
    const { roomName, offer } = data;
    console.log(`Offer from ${userName.toUpperCase()} (in room ${roomName})`);
    socket.to(roomName).emit("offer", offer);
  });

  // Handle an answer event within a room
  socket.on("answer", (data) => {
    const { roomName, answer } = data;
    console.log(`Answer from ${userName.toUpperCase()} (in room ${roomName})`);
    socket.to(roomName).emit("answer", answer);
  });

  // Handle an ICE candidate event within a room
  socket.on("ice-candidate", (data) => {
    const { roomName, candidate } = data;
    console.log(
      `ICE candidate from ${userName.toUpperCase()} (in room ${roomName})`
    );
    socket.to(roomName).emit("ice-candidate", candidate);
  });
};
