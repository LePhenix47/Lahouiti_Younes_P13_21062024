module.exports = (io, socket, connectedUsersMap, roomsMap) => {
  // Handle a user creating a room
  socket.on("create-room", (roomName) => {
    // Optionally, you can add logic to check if the room already exists
    socket.join(roomName);
    console.log(`Room ${roomName} created by user ${socket.id}`);

    // Optionally emit a success message back to the creator
    socket.emit("room-created", { roomName });
  });

  // Handle a user joining a room
  socket.on("join-room", (username) => {
    const sessionId = connectedUsersMap.get(username);
    if (!sessionId) {
      console.warn(`User ${username} not found in connected users`);
      return;
    }

    console.log(
      `User ${socket.id} joined room with ${username} (${sessionId})`
    );
    socket.join(sessionId); // Join the room using the session ID
  });

  // Handle a user leaving a room
  socket.on("leave-room", (username) => {
    const sessionId = connectedUsersMap.get(username);
    if (!sessionId) {
      console.warn(`User ${username} not found in connected users`);
      return;
    }

    console.log(`User ${socket.id} left room with ${username} (${sessionId})`);
    socket.leave(sessionId); // Leave the room using the session ID
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
