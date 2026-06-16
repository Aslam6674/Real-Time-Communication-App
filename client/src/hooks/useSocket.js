import { useEffect } from 'react'
import { io } from 'socket.io-client'

// Single socket instance created once, outside React's render cycle
const socket = io('http://localhost:5000', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

export function useSocket() {
  useEffect(() => {
    socket.connect()

    socket.on('connect', () => console.log('🟢 Socket connected:', socket.id))
    socket.on('disconnect', () => console.log('🔴 Socket disconnected'))
    socket.on('connect_error', (err) => console.error('❌ Connection error:', err.message))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
    }
  }, [])

  return socket
}
