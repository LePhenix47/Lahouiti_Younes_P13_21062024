module.exports = (io, socket) => {
  socket.on("offer", (data) => {
    socket.to(data.room).emit("offer", data);
  });

  socket.on("answer", (data) => {
    socket.to(data.room).emit("answer", data);
  });

  socket.on("candidate", (data) => {
    socket.to(data.room).emit("candidate", data);
  });
};
