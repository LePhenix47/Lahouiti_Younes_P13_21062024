module.exports = (io, socket) => {
  socket.on("join", (msg) => {
    console.log("join", msg);
    io.emit("join", msg);
  });

  socket.on("chat", (msg) => {
    console.log("chat", msg);
    io.emit("chat", msg);
  });

  socket.on("leave", (msg) => {
    console.log("leave", msg);
    io.emit("leave", msg);
  });
};
