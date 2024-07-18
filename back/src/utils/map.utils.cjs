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

module.exports = {
  getUniqueConnectedUsers,
};
