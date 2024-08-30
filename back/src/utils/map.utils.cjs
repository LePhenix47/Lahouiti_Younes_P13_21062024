/**
 * Extracts unique usernames from the connectedUsersMap keys.
 *
 * @param {Map} connectedUsersMap - The map containing connected users.
 * @return {Array} An array of unique usernames.
 */
const getUniqueConnectedUsers = (connectedUsersMap) => {
  // Extract usernames from the keys of the map
  const usernames = Array.from(connectedUsersMap.keys());

  // Convert the array to a Set to ensure uniqueness
  const uniqueUsernames = [...new Set(usernames)];

  return uniqueUsernames;
};

/**
 * Converts a rooms map into an array of objects containing room information.
 *
 * @param {Map} roomsMap - A map containing room details with the key as the room creator and the value as a tuple with the creator's name and the joiner's name.
 * @return {Array<{roomName: string, isFull: boolean}>} An array of objects containing the room name and a boolean indicating whether the room is full.
 */
const getRoomsArrayFromMap = (roomsMap) => {
  const roomsArray = Array.from(roomsMap.entries());

  const formattedRoomsArray = roomsArray.map(
    ([creator, [creatorName, joinerName]]) => {
      return {
        roomName: creatorName,
        isFull: joinerName !== null, // * The room is full if there's a joiner
      };
    }
  );

  return formattedRoomsArray;
};

module.exports = {
  getUniqueConnectedUsers,
  getRoomsArrayFromMap,
};
