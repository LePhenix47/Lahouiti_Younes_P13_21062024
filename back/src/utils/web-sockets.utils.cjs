const { getRoomsArrayFromMap } = require("../utils/map.utils.cjs");

/**
 * Deletes a room and handles the necessary socket.io emissions after the deletion.
 * The method deletes the room from the rooms map and the user from the connected users map.
 * It then emits the "room-deleted" event on the room the user was in, and the "room-list" event on all users.
 * @param {SocketIO.Server} io - The Socket.IO server instance.
 * @param {Socket} socket - The Socket.IO socket object of the user to delete the room for.
 * @param {string} roomName - The name of the room to delete.
 * @param {string} userName - The username of the user who created the room.
 */
const deleteRoomAndHandleEmissions = (
  io,
  socket,
  connectedUsersMap,
  roomsMap,
  roomName,
  userName
) => {
  if (roomName) {
    console.log(
      `deleteRoomAndHandleEmissions: Room ${roomName} deleted by user ${userName} (${socket.id})`
    );

    socket.to(roomName).emit("room-deleted", { roomName, userName });
    socket.emit("room-deleted", { roomName, userName });
  }

  if (connectedUsersMap) {
    connectedUsersMap.delete(userName); // ? If the user disconnects
  }

  roomsMap.delete(userName);
  io.emit("room-list", getRoomsArrayFromMap(roomsMap));
};

module.exports = { deleteRoomAndHandleEmissions };
