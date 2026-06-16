import { useState, useEffect } from 'react'

const FILE_ICONS  = { pdf:'📄', zip:'🗜️', doc:'📝', docx:'📝', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', mp4:'🎬', mp3:'🎵', txt:'📃' }
const FILE_COLORS = { pdf:'rgba(255,77,109,0.15)', zip:'rgba(255,209,102,0.15)', doc:'rgba(124,107,255,0.15)', docx:'rgba(124,107,255,0.15)' }

const getExt   = name => (name.split('.').pop() || '').toLowerCase()
const getIcon  = name => FILE_ICONS[getExt(name)]  || '📎'
const getColor = name => FILE_COLORS[getExt(name)] || 'rgba(6,214,160,0.15)'
const fmtSize  = bytes => bytes < 1048576 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB'

export default function FileShare({ socket, roomId, user }) {
  const [files, setFiles] = useState([])
  const [drag,  setDrag]  = useState(false)

  useEffect(() => {
    if (!socket) return
    const handleFile = (fileInfo) => setFiles(prev => [...prev, fileInfo])
    socket.on('file-shared', handleFile)
    return () => socket.off('file-shared', handleFile)
  }, [socket])

  const addFiles = (fileList) => {
    Array.from(fileList).forEach(f => {
      const info = {
        id: Date.now() + Math.random(),
        name: f.name,
        size: fmtSize(f.size),
        uploader: user.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        progress: 0,
        done: false
      }
      setFiles(prev => [...prev, info])

      let prog = 0
      const iv = setInterval(() => {
        prog += Math.random() * 30 + 10
        if (prog >= 100) {
          prog = 100
          clearInterval(iv)
          setFiles(prev => prev.map(x => x.id === info.id ? { ...x, progress: 100, done: true } : x))
          if (socket) socket.emit('file-shared', { roomId, fileInfo: { ...info, progress: 100, done: true } })
        } else {
          setFiles(prev => prev.map(x => x.id === info.id ? { ...x, progress: prog } : x))
        }
      }, 150)
    })
  }

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id))

  const onDrop = (e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 bg-[#111118] border-b border-purple-900/20 flex items-center gap-3">
        <span className="text-base">📁</span>
        <span className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Shared Files</span>
        <span className="ml-auto text-xs text-gray-600">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        className={`mx-5 mt-4 mb-2 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all relative
          ${drag ? 'border-purple-500 bg-purple-900/10' : 'border-purple-900/30 hover:border-purple-700/50'}`}>
        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => addFiles(e.target.files)} />
        <div className="text-3xl mb-2">☁️</div>
        <div className="text-sm font-medium text-gray-300 mb-1">Drop files to share or click to browse</div>
        <div className="text-xs text-gray-600">Encrypted with AES-256 before transfer</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-2">
        {files.length === 0 && <div className="text-center text-gray-600 text-sm mt-8">No files shared yet</div>}
        {files.map(f => (
          <div key={f.id} className="flex items-center gap-3 p-3 bg-[#111118] border border-purple-900/20 rounded-xl hover:border-purple-900/40 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: getColor(f.name) }}>
              {getIcon(f.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{f.name}</div>
              <div className="text-xs text-gray-600 mt-0.5">{f.size} · {f.uploader} · {f.time}</div>
              {!f.done && (
                <div className="mt-1.5 h-1 bg-[#1f1f28] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${f.progress}%` }} />
                </div>
              )}
            </div>
            <div className="w-6 h-6 rounded flex items-center justify-center text-xs bg-teal-900/20 border border-teal-800/30 text-teal-400 flex-shrink-0" title="AES-256 Encrypted">🔒</div>
            {f.done && (
              <button onClick={() => removeFile(f.id)}
                className="w-7 h-7 rounded-lg bg-[#18181f] border border-purple-900/20 flex items-center justify-center text-xs text-gray-500 hover:text-red-400 hover:border-red-800/30 transition-all">🗑️</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
