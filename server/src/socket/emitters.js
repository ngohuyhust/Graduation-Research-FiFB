// Phat su kien realtime tu server den client.
const { getIO } = require("./index");

function emitToUser(userId, event, data) {
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit(event, data);
}

module.exports = { emitToUser };
