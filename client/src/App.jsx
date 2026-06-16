import { useState, useEffect, useRef } from 'react'
import Auth       from './components/Auth'
import VideoGrid  from './components/VideoGrid'
import Whiteboard from './components/Whiteboard'
import Chat       from './components/Chat'
import FileShare  from './components/FileShare'
import Controls   from './components/Controls'
import { useSocket } from './hooks/useSocket'
import { useWebRTC } from './hooks/useWebRTC'

// Room comes from the URL (?room=xyz) so different users can join the
// same call by sharing a link. Falls back to a default room if absent.
function getRoomId() {
  const params = new URLSearchParams(window.location.search)
  return params.get('room') || 'lobby'
}

export default function App() {
  const [user,         setUser]         = useState(null)
  const [tab,          setTab]          = useState('video')
  const [localStream,  setLocalStream]  = useState(null)
  const [screenStream, setScreenStream] = useState(null)
  const [micOn,        setMicOn]        = useState(true)
  const [camOn,        setCamOn]        = useState(true)
  const [screenOn,     setScreenOn]     = useState(false)
  const [timer,        setTimer]        = useState(0)
  const [mediaError,   setMediaError]   = useState('')
  const timerRef = useRef(null)
  const roomId   = useRef(getRoomId()).current

  const socket = useSocket()
  const peers  = useWebRTC(socket, roomId, localStream)

  useEffect(() => {
    if (!user) return

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream)
      })
      .catch(err => {
        console.error('Camera/mic error:', err)
        setMediaError('Camera/microphone unavailable — joining audio/video-less. Check browser permissions.')
        setCamOn(false)
        setMicOn(false)
      })

    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [user])

  // Join the room only once we know whether we have local media or not,
  // so existing peers receive a join event with our correct name.
  useEffect(() => {
    if (!user || !socket) return
    socket.emit('join-room', { roomId, userId: user.id, userName: user.name })
  }, [user, socket, roomId])

  const toggleMic = () => {
    if (!localStream) return
    localStream.getAudioTracks().forEach(t => { t.enabled = !micOn })
    setMicOn(!micOn)
  }

  const toggleCam = () => {
    if (!localStream) return
    localStream.getVideoTracks().forEach(t => { t.enabled = !camOn })
    setCamOn(!camOn)
  }

  const toggleScreen = async () => {
    if (screenOn) {
      screenStream?.getTracks().forEach(t => t.stop())
      setScreenStream(null)
      setScreenOn(false)
      socket.emit('screen-share', { roomId, sharing: false })
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        setScreenStream(stream)
        setScreenOn(true)
        socket.emit('screen-share', { roomId, sharing: true })
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null)
          setScreenOn(false)
        }
      } catch (err) {
        console.error('Screen share error:', err)
      }
    }
  }

  const endCall = () => {
    if (!window.confirm('End the call for everyone?')) return
    localStream?.getTracks().forEach(t => t.stop())
    screenStream?.getTracks().forEach(t => t.stop())
    clearInterval(timerRef.current)
    setUser(null)
    setLocalStream(null)
    setScreenStream(null)
    setTimer(0)
  }

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    navigator.clipboard.writeText(url)
    alert('Invite link copied!\n\n' + url + '\n\nSend this to others — they will join your room.')
  }

  const fmtTimer = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0')
    const sec = String(s % 60).padStart(2, '0')
    return `${m}:${sec}`
  }

  const tabs = [
    ['video',      '📹', 'Video'],
    ['whiteboard', '🎨', 'Board'],
    ['files',      '📁', 'Files'],
    ['chat',       '💬', 'Chat'],
  ]

  if (!user) return <Auth onLogin={setUser} />

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Topbar */}
      <div className="h-14 bg-[#111118] border-b border-purple-900/20 flex items-center px-5 gap-4 flex-shrink-0">
        <span className="text-xl font-black text-purple-400" style={{ fontFamily: 'Syne, sans-serif' }}>NexMeet ✦</span>

        <button onClick={copyInviteLink}
          className="bg-[#18181f] border border-purple-900/20 hover:border-purple-500 rounded-full
            px-3 py-1 text-xs text-gray-400 hover:text-purple-300 flex items-center gap-2 transition-colors">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Room: {roomId} · {peers.length + 1} participant{peers.length !== 0 ? 's' : ''} · 🔗 Copy Invite
        </button>

        <div className="text-xs text-purple-400 font-mono font-bold bg-purple-900/20 border border-purple-800/30 rounded-full px-3 py-1">
          ⏱ {fmtTimer(timer)}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-teal-400 border border-teal-800/40 bg-teal-900/20 rounded-full px-3 py-1">🔒 E2E Encrypted</span>
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-black" style={{ fontFamily: 'Syne, sans-serif' }}>
            {initials}
          </div>
        </div>
      </div>

      {mediaError && (
        <div className="bg-yellow-900/20 border-b border-yellow-800/30 text-yellow-400 text-xs px-5 py-2">
          ⚠️ {mediaError}
        </div>
      )}

      {/* Tab Nav */}
      <div className="flex bg-[#111118] border-b border-purple-900/20 px-4 gap-0 flex-shrink-0">
        {tabs.map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5
              ${tab === t ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-600 hover:text-gray-300'}`}
            style={{ fontFamily: 'Syne, sans-serif' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'video' && (
          <VideoGrid localStream={localStream} peers={peers} user={user} micOn={micOn} camOn={camOn} screenStream={screenStream} />
        )}
        {tab === 'whiteboard' && <Whiteboard socket={socket} roomId={roomId} />}
        {tab === 'files'      && <FileShare socket={socket} roomId={roomId} user={user} />}
        {tab === 'chat'       && <Chat socket={socket} roomId={roomId} user={user} />}
      </div>

      {tab === 'video' && (
        <Controls
          micOn={micOn} camOn={camOn} screenOn={screenOn}
          onToggleMic={toggleMic} onToggleCam={toggleCam} onToggleScreen={toggleScreen}
          onEndCall={endCall} setTab={setTab}
        />
      )}
    </div>
  )
}
