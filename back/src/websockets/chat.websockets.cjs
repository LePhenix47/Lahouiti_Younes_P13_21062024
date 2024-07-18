// chatSocketListener.js
const { getUniqueConnectedUsers } = require("../utils/map.utils.cjs");

module.exports = (io, socket, connectedUsersMap) => {
  socket.on("join", (msg) => {
    const { sender } = msg;
    connectedUsersMap.set(sender, socket.id); // Store username and socket.id in the map
    console.log("join", msg, connectedUsersMap);

    io.emit("join", {
      ...msg,
      users: getUniqueConnectedUsers(connectedUsersMap),
    });
  });

  socket.on("chat", (msg) => {
    console.log("chat", msg);
    io.emit("chat", msg);
  });

  socket.on("leave", (msg) => {
    const { sender } = msg;
    connectedUsersMap.delete(sender); // Remove user from map on leave
    console.log("leave", msg, connectedUsersMap);
    io.emit("leave", {
      ...msg,
      users: getUniqueConnectedUsers(connectedUsersMap),
    });
  });
};
