/**
 * Map to store username and socket.id
 *
 * @type {Map<string, string>}
 */
const connectedUsersMap = new Map();

/**
 * Map to store room details, with the key the initializer and the value a tuple with 2 elements: [initializer, otherPeer]
 *
 * @type {Map<string, [string, string|null]>}
 */
const roomsMap = new Map();

module.exports = { connectedUsersMap, roomsMap };
