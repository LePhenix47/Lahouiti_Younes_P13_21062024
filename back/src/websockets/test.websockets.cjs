module.exports = (io, socket) => {
  socket.on("test", (msg) => {
    io.emit("Successfully received message test", msg);
  });
};
