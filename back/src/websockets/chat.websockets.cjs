module.exports = (io, socket, connectedUsersSet) => {
  socket.on("join", (msg) => {
    const { sender } = msg;
    connectedUsersSet.add(sender);
    console.log("join", msg, connectedUsersSet);

    io.emit("join", { ...msg, users: Array.from(connectedUsersSet) });
  });

  socket.on("chat", (msg) => {
    console.log("chat", msg);
    io.emit("chat", msg);
  });

  socket.on("leave", (msg) => {
    const { sender } = msg;
    connectedUsersSet.delete(sender);
    console.log("leave", msg, connectedUsersSet);
    io.emit("leave", { ...msg, users: Array.from(connectedUsersSet) });
  });
};
