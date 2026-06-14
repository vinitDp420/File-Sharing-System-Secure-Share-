import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export const connectSocket = (userId, isAdmin = false) => {
  const s = getSocket()
  if (!s.connected) s.connect()
  if (userId) s.emit('join:user', userId)
  if (isAdmin) s.emit('join:admin')
  return s
}

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect()
}
