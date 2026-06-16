import { useEffect, useRef } from 'react'

function VideoTile({ stream, label, muted = false, speaking = false, camOn = true }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])

  const initials = label
    ? label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className={`relative bg-[#111118] rounded-xl overflow-hidden
      flex items-center justify-center min-h-0 border transition-all
      ${speaking ? 'border-purple-500 shadow-lg shadow-purple-900/40' : 'border-purple-900/20'}`}>

      {stream && camOn ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-purple-900/30 border border-purple-700/30
            flex items-center justify-center text-xl font-black text-purple-400"
            style={{ fontFamily: 'Syne, sans-serif' }}>
            {initials}
          </div>
          {!camOn && <span className="text-xs text-gray-600">Camera off</span>}
          {!stream && camOn && <span className="text-xs text-gray-600">Connecting…</span>}
        </div>
      )}

      {speaking && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-xl animate-pulse pointer-events-none" />
      )}

      <span className="absolute bottom-2 left-3 bg-black/70 text-xs text-white
        px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
        {label}
      </span>

      <div className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(124,107,255,0.02) 2px,rgba(124,107,255,0.02) 4px)' }} />
    </div>
  )
}

export default function VideoGrid({ localStream, peers, user, micOn, camOn, screenStream }) {
  const cols = peers.length === 0 ? '1fr' : 'repeat(2, 1fr)'

  return (
    <div className="flex-1 grid gap-3 p-4 overflow-auto"
      style={{ gridTemplateColumns: cols, alignContent: 'start' }}>

      {screenStream && (
        <div className="col-span-2 relative bg-[#0d1117] rounded-xl overflow-hidden
          border border-teal-500/40 shadow-lg shadow-teal-900/20 flex items-center justify-center min-h-[200px]">
          <video autoPlay playsInline muted
            ref={el => { if (el) el.srcObject = screenStream }}
            className="w-full h-full object-contain" />
          <span className="absolute bottom-2 left-3 bg-black/70 text-xs text-teal-400 px-2 py-1 rounded-md">
            🖥️ {user.name}'s Screen
          </span>
        </div>
      )}

      <VideoTile stream={localStream} label={`${user.name} (You)`} muted speaking camOn={camOn} />

      {peers.map(p => (
        <VideoTile key={p.socketId} stream={p.stream} label={p.userName} camOn />
      ))}
    </div>
  )
}
