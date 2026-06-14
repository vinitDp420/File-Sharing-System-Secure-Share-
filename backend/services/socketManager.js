const io_connections = new Set();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    io_connections.add(socket.id);

    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`👑 Admin joined: ${socket.id}`);
    });

    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      io_connections.delete(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
