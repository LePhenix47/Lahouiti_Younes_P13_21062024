module.exports = (io, socket) => {
  socket.on("offer", (data) => {
    console.log("offer", offer);
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", (data) => {
    console.log("answer", answer);
    socket.broadcast.emit("answer", data);
  });

  socket.on("ice-candidate", (data) => {
    console.log("ice-candidate", candidate);
    socket.broadcast.emit("ice-candidate", data);
  });
};
