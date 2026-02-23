import React, { useState, useEffect, useRef } from 'react'

function Widget() {
  const [data, setData] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  
  // PEEK INDEX: 0 = Current, 1 = Next, etc.
  const [peekIndex, setPeekIndex] = useState(0);

  useEffect(() => {
    window.api.onTimerUpdate((newData) => {
      setData(newData);
    })
  }, [])

  const handleMouseEnter = () => {
    setIsHovered(true)
    window.api.setIgnoreMouseEvents(false)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    window.api.setIgnoreMouseEvents(true)
    
    // AUTO-RESET: When you look away, snap back to the current task
    setPeekIndex(0);
  }

  // --- SCROLL TO PEEK LOGIC ---
  const handleWheel = (e) => {
    if (!data || !data.queue) return;
    
    // Stop the scroll from scrolling the page
    e.stopPropagation();

    if (e.deltaY > 0) {
        // Scroll Down -> Show Next
        setPeekIndex(prev => Math.min(prev + 1, data.queue.length - 1));
    } else {
        // Scroll Up -> Show Previous
        setPeekIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!data || data.status === 'idle') return null;

  // --- DETERMINE WHAT TO DISPLAY ---
  // If peekIndex is 0, show CURRENT data.
  // If peekIndex > 0, show FUTURE data from the queue.
  let displayTitle = data.title;
  let displayTime = formatTime(data.timeLeft);
  let displayLabel = "Working on";
  
  // Safe access to queue
  if (peekIndex > 0 && data.queue && data.queue[peekIndex]) {
      const futureTask = data.queue[peekIndex];
      displayTitle = futureTask.title;
      // Show START TIME instead of Timer
      displayTime = futureTask.startTime;
      displayLabel = "Up Next";
  }

  // Expansion Logic
  const isExpanded = isHovered || data.status === 'transition' || data.status === 'completed';
  
  // Visual Styles
  let borderColor = 'border-white/10';
  let shadowColor = 'shadow-black/50';
  let indicatorColor = 'bg-emerald-400';
  
  if (data.status === 'transition') {
      borderColor = 'border-emerald-500/50';
      shadowColor = 'shadow-emerald-900/50';
      indicatorColor = 'bg-emerald-500';
  } else if (data.status === 'completed') {
      borderColor = 'border-blue-500/50';
      shadowColor = 'shadow-blue-900/50';
      indicatorColor = 'bg-blue-500';
  } else if (peekIndex > 0) {
      // VISUAL CUE FOR PEEKING: Subtle Purple border
      borderColor = 'border-purple-500/30';
      indicatorColor = 'bg-purple-400';
  } else if (data.timeLeft === 0) {
     borderColor = 'border-red-500/50';
  }

  return (
    <div className="flex justify-end items-end h-screen w-full pr-4 pb-4">
      <div 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel} // Attach Scroll Listener
        className={`
          relative flex items-center overflow-hidden
          bg-gray-900/95 backdrop-blur-md border shadow-2xl
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${borderColor} ${shadowColor}
          ${isExpanded ? 'w-[19rem] h-14 rounded-[16px]' : 'w-40 h-9 rounded-full'}
        `}
      >
        {/* Status Dot */}
        <div className="flex items-center justify-center pl-3 shrink-0">
             <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor} ${data.status === 'active' && peekIndex === 0 ? 'animate-pulse' : ''} shadow-[0_0_6px_currentColor]`}></div>
        </div>

        {/* Time Text (Timer OR Start Time) */}
        <div className="pl-3 font-mono font-bold text-sm text-white tracking-wider shrink-0 select-none pt-0.5">
            {data.status === 'transition' ? 'DONE!' : data.status === 'completed' ? 'FINISH' : displayTime}
        </div>

        {/* Content Area */}
        <div className="flex-1 h-full relative ml-3">
            {/* Collapsed State */}
            <div className={`absolute inset-0 flex items-center transition-all duration-300 ${isExpanded ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                <span className="text-xs text-white/40 truncate max-w-[90px] select-none font-medium pt-0.5">
                    {displayTitle}
                </span>
            </div>

            {/* Expanded State */}
            <div className={`absolute inset-0 flex items-center gap-2 pr-3 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                <div className="flex flex-col justify-center mr-auto overflow-hidden">
                    <span className={`text-[9px] uppercase font-bold tracking-wider ${data.status === 'transition' ? 'text-emerald-400' : 'text-white/30'}`}>
                        {data.status === 'transition' ? 'Completed' : data.status === 'completed' ? 'Session' : displayLabel}
                    </span>
                    <span className="text-xs text-white font-medium truncate w-[100px]">{displayTitle}</span>
                </div>
                {data.status === 'active' && peekIndex === 0 && (
                    <button 
                        onClick={() => window.api.sendWidgetCommand('stop')}
                        className="h-7 px-3 rounded-md bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/5 hover:border-red-500/20 text-white/70 text-[10px] font-bold transition-all whitespace-nowrap"
                    >
                        Stop
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}

export default Widget