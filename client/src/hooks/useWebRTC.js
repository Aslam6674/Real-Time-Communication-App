import { useEffect, useRef, useState, useCallback } from 'react'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

/**
 * Manages a full mesh of native RTCPeerConnections — one per remote
 * participant — keyed by their socket.id. No third-party WebRTC
 * wrapper libraries are used, so there is nothing to polyfill.
 */
export function useWebRTC(socket, roomId, localStream) {
  const [peers, setPeers] = useState([])   // [{ socketId, userName, stream }]
  const pcsRef            = useRef({})     // socketId -> RTCPeerConnection
  const namesRef           = useRef({})    // socketId -> userName

  const updatePeerStream = useCallback((socketId, stream) => {
    setPeers(prev => {
      const exists = prev.find(p => p.socketId === socketId)
      if (exists) {
        return prev.map(p => p.socketId === socketId ? { ...p, stream } : p)
      }
      return [...prev, { socketId, userName: namesRef.current[socketId] || 'Guest', stream }]
    })
  }, [])

  const removePeer = useCallback((socketId) => {
    const pc = pcsRef.current[socketId]
    if (pc) { pc.close(); delete pcsRef.current[socketId] }
    delete namesRef.current[socketId]
    setPeers(prev => prev.filter(p => p.socketId !== socketId))
  }, [])

  const createPeerConnection = useCallback((remoteSocketId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Attach our local tracks so the remote side receives our audio/video
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
    }

    // When the remote peer's media arrives
    pc.ontrack = (event) => {
      updatePeerStream(remoteSocketId, event.streams[0])
    }

    // Send any local ICE candidates to the remote peer via the signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          to: remoteSocketId,
          signal: { type: 'ice-candidate', candidate: event.candidate }
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        // Let user-left handle full cleanup; just log here
        console.log(`Peer ${remoteSocketId} connection state:`, pc.connectionState)
      }
    }

    pcsRef.current[remoteSocketId] = pc
    return pc
  }, [localStream, socket, updatePeerStream])

  // We are the caller — create an offer for a remote peer
  const callPeer = useCallback(async (remoteSocketId, userName) => {
    namesRef.current[remoteSocketId] = userName
    const pc = createPeerConnection(remoteSocketId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('signal', {
      to: remoteSocketId,
      signal: { type: 'offer', sdp: offer }
    })
  }, [createPeerConnection, socket])

  useEffect(() => {
    if (!socket || !roomId) return

    // List of peers already in the room when we join — we call each of them
    const onExistingPeers = (existingPeers) => {
      existingPeers.forEach(({ socketId, userName }) => {
        callPeer(socketId, userName)
      })
    }

    // Someone new joined after us — wait for their offer (they call us)
    const onUserJoined = ({ socketId, userName }) => {
      namesRef.current[socketId] = userName
    }

    // Incoming signaling message: offer / answer / ice-candidate
    const onSignal = async ({ from, signal }) => {
      let pc = pcsRef.current[from]

      if (signal.type === 'offer') {
        if (!pc) pc = createPeerConnection(from)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('signal', { to: from, signal: { type: 'answer', sdp: answer } })
      } else if (signal.type === 'answer') {
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      } else if (signal.type === 'ice-candidate') {
        if (pc) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)) }
          catch (err) { console.error('ICE candidate error:', err) }
        }
      }
    }

    const onUserLeft = (socketId) => removePeer(socketId)

    socket.on('existing-peers', onExistingPeers)
    socket.on('user-joined', onUserJoined)
    socket.on('signal', onSignal)
    socket.on('user-left', onUserLeft)

    return () => {
      socket.off('existing-peers', onExistingPeers)
      socket.off('user-joined', onUserJoined)
      socket.off('signal', onSignal)
      socket.off('user-left', onUserLeft)
    }
  }, [socket, roomId, localStream, callPeer, createPeerConnection, removePeer])

  // Clean up all connections on unmount
  useEffect(() => {
    return () => {
      Object.values(pcsRef.current).forEach(pc => pc.close())
      pcsRef.current = {}
    }
  }, [])

  return peers
}
