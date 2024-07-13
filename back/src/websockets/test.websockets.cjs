module.exports = (io, socket) => {
  socket.on("test", (msg) => {
    console.log("Successfully received message test", msg);

    socket.emit("test", "test (server)");
  });
};
