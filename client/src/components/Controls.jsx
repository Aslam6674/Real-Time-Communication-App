export default function Controls({
  micOn, camOn, screenOn,
  onToggleMic, onToggleCam, onToggleScreen, onEndCall,
  setTab
}) {
  const btns = [
    { icon: micOn ? '🎙️' : '🔇', label: micOn ? 'Mute' : 'Unmuted', onClick: onToggleMic, off: !micOn },
    { icon: camOn ? '📷' : '📵', label: camOn ? 'Camera' : 'Cam Off', onClick: onToggleCam, off: !camOn },
    { icon: '🖥️', label: screenOn ? 'Sharing' : 'Share', onClick: onToggleScreen, off: false, active: screenOn },
    { icon: '🎨', label: 'Board', onClick: () => setTab('whiteboard') },
    { icon: '💬', label: 'Chat', onClick: () => setTab('chat') },
    { icon: '📁', label: 'Files', onClick: () => setTab('files') },
  ]

  return (
    <div className="flex items-center justify-center gap-3 py-3 bg-[#111118] border-t border-purple-900/20 px-4">
      {btns.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <button onClick={b.onClick}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all border
              ${b.off ? 'bg-red-900/20 border-red-700/40 hover:bg-red-900/30'
                : b.active ? 'bg-purple-600/30 border-purple-500'
                : 'bg-[#18181f] border-purple-900/20 hover:border-purple-500 hover:bg-purple-900/10'}`}>
            {b.icon}
          </button>
          <span className={`text-xs ${b.off ? 'text-red-400' : b.active ? 'text-purple-400' : 'text-gray-600'}`}>{b.label}</span>
        </div>
      ))}

      <div className="flex flex-col items-center gap-1 mx-2">
        <button onClick={onEndCall}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-red-600 hover:bg-red-500
            border border-transparent transition-all hover:shadow-lg hover:shadow-red-900/40">
          📵
        </button>
        <span className="text-xs text-red-400">End</span>
      </div>
    </div>
  )
}
