import { useEffect, useRef, useState } from 'react'

export default function Whiteboard({ socket, roomId }) {
  const canvasRef = useRef()
  const drawing   = useRef(false)
  const last      = useRef({ x: 0, y: 0 })
  const history   = useRef([])

  const [tool,  setTool]  = useState('pen')
  const [color, setColor] = useState('#a594ff')
  const [size,  setSize]  = useState(4)

  // drawLine defined before any useEffect references it
  const drawLine = (x0, y0, x1, y1, col, sz, emit) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.strokeStyle = col
    ctx.lineWidth   = sz
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()

    if (emit && socket) {
      socket.emit('draw', { roomId, data: { x0, y0, x1, y1, color: col, size: sz } })
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
  }, [])

  useEffect(() => {
    if (!socket) return
    const handleDraw = ({ x0, y0, x1, y1, color: c, size: s }) => drawLine(x0, y0, x1, y1, c, s, false)
    const handleClear = () => {
      const canvas = canvasRef.current
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }
    socket.on('draw', handleDraw)
    socket.on('clear-board', handleClear)
    return () => {
      socket.off('draw', handleDraw)
      socket.off('clear-board', handleClear)
    }
  }, [socket])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const img = canvas.toDataURL()
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const image = new Image()
      image.onload = () => canvas.getContext('2d').drawImage(image, 0, 0)
      image.src = img
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const onMouseDown = (e) => {
    drawing.current = true
    const pos = getPos(e)
    last.current = { x: pos.x, y: pos.y }
    history.current.push(
      canvasRef.current.getContext('2d').getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
    )
    if (history.current.length > 30) history.current.shift()
  }

  const onMouseMove = (e) => {
    if (!drawing.current) return
    const pos = getPos(e)
    const col = tool === 'eraser' ? '#0a0a0f' : color
    const sz  = tool === 'eraser' ? size * 5   : size
    drawLine(last.current.x, last.current.y, pos.x, pos.y, col, sz, true)
    last.current = { x: pos.x, y: pos.y }
  }

  const onMouseUp = () => { drawing.current = false }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    history.current = []
    if (socket) socket.emit('clear-board', { roomId })
  }

  const undoCanvas = () => {
    if (!history.current.length) return
    canvasRef.current.getContext('2d').putImageData(history.current.pop(), 0, 0)
  }

  const downloadCanvas = () => {
    const a = document.createElement('a')
    a.download = 'whiteboard.png'
    a.href = canvasRef.current.toDataURL()
    a.click()
  }

  const colors = ['#f0eeff', '#a594ff', '#06d6a0', '#ffd166', '#ff4d6d', '#ffffff']
  const tools  = [['pen', '✏️', 'Pen'], ['eraser', '🧹', 'Eraser']]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111118] border-b border-purple-900/20 flex-wrap">
        <span className="text-xs text-gray-600 mr-1">Tool</span>
        {tools.map(([t, icon, label]) => (
          <button key={t} onClick={() => setTool(t)} title={label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all border
              ${tool === t ? 'bg-purple-600/30 border-purple-500' : 'bg-[#18181f] border-purple-900/20 hover:border-purple-600'}`}>
            {icon}
          </button>
        ))}

        <div className="w-px h-6 bg-purple-900/30 mx-1" />
        <span className="text-xs text-gray-600">Color</span>
        {colors.map(c => (
          <div key={c} onClick={() => setColor(c)} style={{ background: c }}
            className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-125
              ${color === c ? 'ring-2 ring-white scale-110' : ''}`} />
        ))}

        <div className="w-px h-6 bg-purple-900/30 mx-1" />
        <span className="text-xs text-gray-600">Size</span>
        <select value={size} onChange={e => setSize(Number(e.target.value))}
          className="bg-[#18181f] border border-purple-900/20 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none">
          {[2, 4, 8, 16].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>

        <div className="ml-auto flex gap-2">
          <button onClick={undoCanvas} className="text-xs text-gray-500 hover:text-purple-400 px-3 py-1 rounded-lg bg-[#18181f] border border-purple-900/20 transition-colors">↩️ Undo</button>
          <button onClick={downloadCanvas} className="text-xs text-gray-500 hover:text-teal-400 px-3 py-1 rounded-lg bg-[#18181f] border border-purple-900/20 transition-colors">💾 Save</button>
          <button onClick={clearCanvas} className="text-xs text-gray-500 hover:text-red-400 px-3 py-1 rounded-lg bg-[#18181f] border border-purple-900/20 transition-colors">🗑️ Clear</button>
        </div>
      </div>

      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full"
          style={{ background: '#13131a', cursor: tool === 'eraser' ? 'cell' : 'crosshair', display: 'block' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp} />
        <div className="absolute bottom-3 right-4 bg-[#18181f] border border-purple-900/20 rounded-full px-3 py-1 text-xs text-gray-600 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Syncing live with all participants
        </div>
      </div>
    </div>
  )
}
