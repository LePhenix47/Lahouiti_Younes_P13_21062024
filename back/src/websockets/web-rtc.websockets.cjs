module.exports = (io, socket, connectedUsersMap, roomsMap) => {
  // Handle a user creating a room
  socket.on("create-room", (roomName) => {
    const { userName } = socket.handshake.auth;

    if (!connectedUsersMap.has(userName)) {
      console.warn(`Username ${userName} is not connected`);
      socket.emit("room-error", { message: "User does not exist" });
      return;
    }

    if (roomsMap.has(roomName)) {
      // Check if the room already exists
      console.warn(`Room ${roomName} already exists`);
      socket.emit("room-error", { message: "Room already exists" });
      return;
    }

    // Create the room and store the details
    roomsMap.set(roomName, [userName, null]);
    socket.join(roomName);
    console.log(`Room ${roomName} created by user ${userName} (${socket.id})`);

    // Emit a success message back to the creator and update the room list
    socket.emit("room-created", { roomName });
    io.emit("room-list", Array.from(roomsMap.keys()));
  });

  // Handle a user joining a room
  socket.on("join-room", (roomName) => {
    const { userName } = socket.handshake.auth;

    // Check if the user is already in a room
    for (const [name, participants] of roomsMap.entries()) {
      if (!participants.includes(userName)) {
        continue;
      }

      console.warn(`User ${userName} is already in room ${name}`);
      socket.emit("room-error", { message: "You are already in a room" });
      return;
    }

    if (!roomsMap.has(roomName)) {
      console.warn(`Room ${roomName} does not exist`);
      socket.emit("room-error", { message: "Room does not exist" });
      return;
    }

    const room = roomsMap.get(roomName);
    const receiver = room[1];
    if (receiver !== null) {
      console.warn(`Room ${roomName} is already full`);
      socket.emit("room-error", { message: "Room is already full" });
      return;
    }

    // Join the room and update the room details
    receiver = userName;
    roomsMap.set(roomName, room);
    socket.join(roomName);
    console.log(`User ${userName} (${socket.id}) joined room ${roomName}`);

    // Emit a success message back to the joiner and update the room list
    socket.emit("room-joined", { roomName, userName });
    io.emit("room-list", Array.from(roomsMap.keys()));
  });

  // Handle a user leaving a room
  socket.on("leave-room", (roomName) => {
    const { userName } = socket.handshake.auth;

    if (!roomsMap.has(roomName)) {
      console.warn(`Room ${roomName} does not exist`);
      socket.emit("room-error", { message: "Room does not exist" });
      return;
    }

    const room = roomsMap.get(roomName);

    const [initiator, receiver] = room;

    if (initiator !== userName && receiver !== userName) {
      console.warn(`User ${userName} is not part of room ${roomName}`);
      socket.emit("room-error", {
        message: "You are not part of this room",
      });

      return;
    }

    // Leave the room and remove it from the map
    socket.leave(roomName);
    roomsMap.delete(roomName);
    console.log(`User ${userName} (${socket.id}) left room ${roomName}`);

    // Notify both users that the room is deleted
    socket.to(roomName).emit("room-deleted", { roomName });
    io.emit("room-list", Array.from(roomsMap.keys()));
  });

  // Handle an offer event within a room
  socket.on("offer", (data) => {
    const { roomName, offer } = data;
    console.log(`Offer from ${socket.id} in room ${roomName}`, offer);
    socket.to(roomName).emit("offer", offer);
  });

  // Handle an answer event within a room
  socket.on("answer", (data) => {
    const { roomName, answer } = data;
    console.log(`Answer from ${socket.id} in room ${roomName}`, answer);
    socket.to(roomName).emit("answer", answer);
  });

  // Handle an ICE candidate event within a room
  socket.on("ice-candidate", (data) => {
    const { roomName, candidate } = data;
    console.log(
      `ICE candidate from ${socket.id} in room ${roomName}`,
      candidate
    );
    socket.to(roomName).emit("ice-candidate", candidate);
  });
};
