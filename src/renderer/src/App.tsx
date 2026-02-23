import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// --- PERSISTENCE HELPERS ---
const loadData = (key, defaultVal) => {
  const saved = localStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  return defaultVal;
};
const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// --- SOUND ENGINE ---
let audioCtx = null;
let zenOscillators = []; 

const getAudioContext = () => {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    return audioCtx;
};

const toggleZenMode = (enable, type = 'brown') => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    zenOscillators.forEach(node => node.disconnect());
    zenOscillators = [];

    if (!enable) return;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'brown' ? 400 : 1000;
    
    const gain = ctx.createGain();
    gain.gain.value = 0.05; 

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    
    zenOscillators.push(gain); 
};

const playSound = (type) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'task-complete') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); 
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'session-complete') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.value = freq;
        gain2.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
        osc2.start(ctx.currentTime + i * 0.15);
        osc2.stop(ctx.currentTime + 2.0);
      });
    }
  } catch (e) { console.error(e); }
};

// --- ICONS & UI COMPONENTS ---

const Icons = {
    Chart: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M2.25 13.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75v-6.75ZM8.625 10.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 .75.75v9.75a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1-.75-.75V10.5ZM15 3a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1-.75-.75V3.75a.75.75 0 0 1 .75-.75H15Z" clipRule="evenodd" />
            <path d="M19.5 6a.75.75 0 0 0-.75.75v13.5a.75.75 0 0 0 .75.75h2.25a.75.75 0 0 0 .75-.75V6.75a.75.75 0 0 0-.75-.75h-2.25Z" />
        </svg>
    ),
    Settings: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.389c-.42.18-.81.406-1.174.675l-2.106-.601c-.879-.25-1.821.205-2.153 1.055l-.957 2.454c-.332.85.121 1.807.962 2.165l2.09.89a7.55 7.55 0 0 0 0 2.285l-2.09.889c-.841.358-1.294 1.315-.962 2.165l.957 2.454c.332.85 1.274 1.304 2.153 1.055l2.106-.601c.363.268.753.494 1.174.675l.178 1.572c.151.904.933 1.567 1.85 1.567h2.556c.917 0 1.699-.663 1.85-1.567l.178-1.572c.42-.18.81-.406 1.174-.675l2.106.601c.879.25 1.821-.205 2.153-1.055l.957-2.454c.332-.85-.121-1.807-.962-2.165l-2.09-.89a7.55 7.55 0 0 0 0-2.285l2.09-.889c.841-.358 1.294-1.315.962-2.165l-.957-2.454c-.332-.85-1.274-1.304-2.153-1.055l-2.106.601c-.363-.268-.753-.494-1.174-.675l-.178-1.572C15.333 2.913 14.55 2.25 13.633 2.25h-2.556Zm-3.085 7.234a.75.75 0 0 1 .53.22L10.5 11.69l1.977-1.978a.75.75 0 0 1 1.06 1.06L11.561 12.75l1.978 1.977a.75.75 0 0 1-1.06 1.06L10.5 13.811l-1.977 1.978a.75.75 0 0 1-1.06-1.06L9.439 12.75 7.462 10.773a.75.75 0 0 1 .531-1.289Z" clipRule="evenodd" />
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
    )
};

const CustomTitleBar = ({ toggleAnalytics, toggleSettings }) => (
  <div className="h-8 bg-gray-900/50 backdrop-blur-md flex items-center justify-between px-4 border-b border-white/5 titlebar-drag-region z-50">
    <div className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Focus Planner OS</div>
    <div className="flex gap-3 no-drag items-center">
        <button onClick={toggleAnalytics} className="text-white/50 hover:text-emerald-400 transition-colors p-1" title="Analytics"><Icons.Chart /></button>
        <button onClick={toggleSettings} className="text-white/50 hover:text-blue-400 transition-colors p-1" title="Settings"><Icons.Settings /></button>
        <div className="w-[1px] h-3 bg-white/10 mx-1"></div>
        <button onClick={() => window.api?.minimize()} className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400"></button>
        <button onClick={() => window.api?.maximize()} className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400"></button>
        <button onClick={() => window.api?.close()} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400"></button>
    </div>
  </div>
);

// --- COMPONENT: Focus Mode ---
function FocusMode({ playlist, settings, onTaskComplete, onSessionComplete, onExit }) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTask = playlist[currentTrackIndex] || { title: "Done", duration: 0, color: "bg-gray-500" };
  const [status, setStatus] = useState('active'); 
  const [endTime, setEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(currentTask.duration * 60);
  const isProcessingComplete = useRef(false);

  useEffect(() => {
    if (settings.zenMode) toggleZenMode(true, 'brown');
    return () => toggleZenMode(false);
  }, [settings.zenMode]);

  useEffect(() => {
    isProcessingComplete.current = false;
    if (status === 'active' && currentTask.duration > 0) {
        setEndTime(new Date().getTime() + (currentTask.duration * 60 * 1000));
    }
  }, [currentTrackIndex, status, currentTask]);

  useEffect(() => {
    if (status !== 'active' || !endTime) return;
    const interval = setInterval(() => {
      const remainingSeconds = Math.ceil((endTime - new Date().getTime()) / 1000);
      if (remainingSeconds <= 0) {
        clearInterval(interval); 
        setTimeLeft(0);
        if (!isProcessingComplete.current) {
            isProcessingComplete.current = true;
            handleTaskFinish();
        }
      } else {
        setTimeLeft(remainingSeconds);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [endTime, status]);

  const handleTaskFinish = () => {
      if (currentTask.type !== 'break') {
          onTaskComplete(currentTask); 
      }
      if (currentTrackIndex < playlist.length - 1) {
          playSound('task-complete');
          setStatus('transition');
          setTimeout(() => {
              setCurrentTrackIndex(prev => prev + 1);
              setStatus('active');
          }, 3000);
      } else {
          playSound('session-complete');
          onSessionComplete();
          setStatus('completed');
          if (settings.zenMode) toggleZenMode(false);
      }
  };

  useEffect(() => {
    if (!window.api) return;
    const queue = [];
    if (endTime) {
        let accTime = endTime;
        queue.push({ title: currentTask.title, startTime: "--:--", isCurrent: true });
        for (let i = currentTrackIndex + 1; i < playlist.length; i++) {
            const t = playlist[i];
            const d = new Date(accTime);
            queue.push({ title: t.title, startTime: d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false }) });
            accTime += (t.duration * 60 * 1000);
        }
    }
    let widgetData = { title: currentTask.title, color: currentTask.color, timeLeft, status, queue };
    if (currentTask.type === 'break') { widgetData.title = "Micro-Break"; widgetData.color = "bg-blue-500"; }
    if (status === 'transition') { widgetData.title = "Done!"; widgetData.timeLeft = 0; widgetData.color = 'bg-emerald-500'; }
    if (status === 'completed') { widgetData.title = "Finished!"; widgetData.timeLeft = 0; }
    window.api.sendTimerUpdate(widgetData);
    return () => { if (window.api) window.api.sendTimerUpdate({ status: 'idle' }); };
  }, [timeLeft, status, currentTask]);

  useEffect(() => { if (window.api) window.api.onWidgetCommand((cmd) => { if (cmd === 'stop') onExit(); }); }, []);
  const formatTime = (seconds) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
  if (!playlist[currentTrackIndex] && status !== 'completed') return null;

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden font-sans text-white titlebar-drag-region">
      <div className={`absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 animate-pulse ${status === 'transition' ? 'bg-emerald-500' : currentTask.color}`}></div>
      <div className="z-10 text-center space-y-6 no-drag">
        <div className="uppercase tracking-[0.3em] text-white/40 text-sm font-semibold">{currentTask.type === 'break' ? 'RECHARGE' : `TASK ${currentTrackIndex + 1} OF ${playlist.length}`}</div>
        <h1 className="text-6xl font-bold tracking-tight">{status === 'transition' ? `Up Next: ${playlist[currentTrackIndex+1]?.title}` : currentTask.title}</h1>
        {status === 'transition' ? <div className="text-9xl font-bold text-emerald-400 animate-bounce py-8">✓</div> : <div className="text-[12rem] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 font-mono">{formatTime(timeLeft)}</div>}
        <div className="flex gap-4 justify-center mt-8"><button onClick={onExit} className="px-8 py-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">{status === 'completed' ? 'Exit' : 'Stop Session'}</button></div>
      </div>
    </div>
  );
}

// --- ANALYTICS VIEW ---
function AnalyticsView({ history, onClose }) {
    const today = new Date().toDateString();
    const todaysTasks = history.filter(h => new Date(h.timestamp).toDateString() === today);
    const totalMinutes = todaysTasks.reduce((acc, t) => acc + t.duration, 0);
    const score = Math.min(100, Math.round((totalMinutes / 360) * 100)); 
    const heatmap = Array.from({length: 14}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        const mins = history.filter(h => new Date(h.timestamp).toDateString() === d.toDateString()).reduce((acc,t)=>acc+t.duration,0);
        let intensity = 0; if(mins > 0) intensity = 1; if(mins > 60) intensity = 2; if(mins > 180) intensity = 3; if(mins > 300) intensity = 4;
        return { date: d.getDate(), intensity };
    });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-8 animate-in fade-in zoom-in duration-200" onClick={onClose}>
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl p-8 space-y-8" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-white">Productivity Pulse</h2><button onClick={onClose} className="text-white/50 hover:text-white">✕</button></div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-20 bg-gradient-to-tr ${score > 80 ? 'from-emerald-500' : 'from-blue-500'} to-transparent`}></div>
                        <div className="text-6xl font-bold text-white mb-2">{score}</div>
                        <div className="text-xs uppercase tracking-widest text-white/50">Daily Focus Score</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                         <div className="text-xs uppercase tracking-widest text-white/50 mb-4">14 Day Streak</div>
                         <div className="grid grid-cols-7 gap-2">
                             {heatmap.map((day, i) => (<div key={i} className="flex flex-col items-center gap-1"><div className={`w-8 h-8 rounded-md transition-all ${day.intensity === 0 ? 'bg-white/5' : day.intensity === 1 ? 'bg-emerald-900' : day.intensity === 2 ? 'bg-emerald-700' : day.intensity === 3 ? 'bg-emerald-500' : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'}`}></div><span className="text-[9px] text-white/20">{day.date}</span></div>))}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SETTINGS VIEW ---
function SettingsView({ settings, onUpdate, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-8" onClick={onClose}>
             <div className="bg-gray-900 border border-white/10 rounded-2xl w-96 p-8 space-y-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div><div className="text-white font-medium">Zen Mode</div><div className="text-xs text-white/40">Play ambient rain during focus</div></div>
                        <button onClick={() => onUpdate('zenMode', !settings.zenMode)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.zenMode ? 'bg-blue-500' : 'bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.zenMode ? 'left-7' : 'left-1'}`}></div></button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div><div className="text-white font-medium">Smart Breaks</div><div className="text-xs text-white/40">Auto-insert 5m break after 1h tasks</div></div>
                        <button onClick={() => onUpdate('smartBreaks', !settings.smartBreaks)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.smartBreaks ? 'bg-blue-500' : 'bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.smartBreaks ? 'left-7' : 'left-1'}`}></div></button>
                    </div>
                </div>
             </div>
        </div>
    )
}

// --- HORIZONS / PLANNING SCREEN ---
const HorizonsView = ({ onBack, monthlyTasks, setMonthlyTasks }) => {
    const getMonthKey = (offset = 0) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offset);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    };
  
    const buckets = [
      { id: getMonthKey(0), label: "This Month" },
      { id: getMonthKey(1), label: "Next Month" },
      { id: "later", label: "Someday / Later" }
    ];
  
    const [inputState, setInputState] = useState({});
  
    const addTask = (bucketId) => {
      const text = inputState[bucketId];
      if (!text?.trim()) return;
  
      setMonthlyTasks(prev => ({
        ...prev,
        [bucketId]: [...(prev[bucketId] || []), { id: Date.now(), title: text }]
      }));
      setInputState(prev => ({ ...prev, [bucketId]: "" }));
    };
  
    const removeTask = (bucketId, taskId) => {
      setMonthlyTasks(prev => ({
        ...prev,
        [bucketId]: prev[bucketId].filter(t => t.id !== taskId)
      }));
    };
  
    return (
      <div className="h-screen w-screen bg-gray-950 p-8 flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack} 
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
          >
            ← Back to Session
          </button>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Future Horizons
          </h1>
        </div>
  
        <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden pb-4">
          {buckets.map(bucket => (
            <div key={bucket.id} className="flex flex-col bg-white/5 border border-white/5 rounded-2xl p-4">
              <h3 className="text-lg font-bold text-white mb-1">{bucket.label}</h3>
              <span className="text-xs text-white/30 uppercase tracking-widest mb-4">{bucket.id !== 'later' ? bucket.id : 'No Date'}</span>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
                {(monthlyTasks[bucket.id] || []).map(task => (
                  <div key={task.id} className="group flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                    <span className="text-sm text-white/80">{task.title}</span>
                    <button 
                      onClick={() => removeTask(bucket.id, task.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-2"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {(monthlyTasks[bucket.id] || []).length === 0 && (
                  <div className="text-white/20 text-sm italic text-center py-4">Empty</div>
                )}
              </div>
  
              <div className="flex gap-2 mt-auto">
                <input 
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Add task..."
                  value={inputState[bucket.id] || ""}
                  onChange={e => setInputState({ ...inputState, [bucket.id]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addTask(bucket.id)}
                />
                <button 
                  onClick={() => addTask(bucket.id)}
                  className="px-3 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

// --- DRAGGABLE TASK ---
function DraggableTask({ id, title, duration, color, onUpdateDuration, onSetDuration, onDelete, onSaveTemplate, isTemplate }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: id, data: { title, duration, color, originalId: id, isTemplate } });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 999 } : undefined;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(duration);
  const inputRef = useRef(null);
  const formatDuration = (mins) => mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m`.replace(' 0m','') : `${mins}m`;

  const handleRightClick = (e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); setEditValue(duration); };
  const handleSave = () => { setIsEditing(false); const val = parseInt(editValue); if (!isNaN(val) && val > 0) onSetDuration(id, val); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSave(); };
  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);

  return (
    <div ref={setNodeRef} style={style} className="relative p-4 mb-3 rounded-xl bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 group transition-all select-none"
         onContextMenu={(e) => { 
             if (!isTemplate && onSaveTemplate) {
                 e.preventDefault();
                 onSaveTemplate({ title, duration, color });
             }
         }}>
      <div className="flex justify-between items-center mb-2"><span className="text-sm font-medium text-white/90">{title}</span><div className={`h-2 w-2 rounded-full ${color} shadow-[0_0_8px_currentColor]`}></div></div>
      {!isTemplate && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5 relative z-20">
                <button onPointerDown={(e) => { e.stopPropagation(); onUpdateDuration(id, -15); }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white" disabled={duration <= 1}>-</button>
                {isEditing ? (
                    <input ref={inputRef} type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} onPointerDown={(e) => e.stopPropagation()} className="w-[3rem] bg-transparent text-xs font-bold text-white text-center focus:outline-none border-b border-blue-500" />
                ) : (
                    <span onContextMenu={handleRightClick} className="text-xs font-bold text-white min-w-[3rem] text-center cursor-context-menu hover:text-blue-400 transition-colors" title="Right-click to edit exact time">{formatDuration(duration)}</span>
                )}
                <button onPointerDown={(e) => { e.stopPropagation(); onUpdateDuration(id, 15); }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white">+</button>
            </div>
            </div>
      )}
      {isTemplate && <div className="mt-2 text-[10px] text-white/30 uppercase tracking-widest">Template • {formatDuration(duration)}</div>}
      
      {/* DELETE BUTTON */}
      <button onPointerDown={(e) => { e.stopPropagation(); onDelete(id); }} className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-lg scale-75 hover:scale-100">×</button>
      
      <div {...listeners} {...attributes} className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"></div>
    </div>
  );
}

function TimelineSlot({ index, startTime, endTime, tasksInSlot, onRemoveTask }) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${index}` });
  const totalUsed = tasksInSlot.reduce((acc, t) => acc + t.duration, 0);
  const remaining = 60 - totalUsed;
  const isActive = isOver && remaining > 0 ? "bg-blue-500/10 border-blue-400/50" : "border-white/5";
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={setNodeRef} className={`relative pl-32 border-l border-white/10 h-32 transition-colors duration-200 ${isActive} flex flex-col`}>
       <div className={`absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full ${totalUsed > 0 ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]' : 'bg-gray-700'}`}></div>
       <div className="absolute -left-28 top-[-6px] flex flex-col items-end w-24">
          <span className="text-sm text-white/90 font-mono font-bold">{formatTime(startTime)}</span>
          <span className="text-[10px] text-white/30 font-mono">{formatTime(endTime)}</span>
       </div>
       <div className="absolute top-3 w-full border-t border-dashed border-white/5"></div>
       <div className="flex-1 w-full flex flex-col gap-[1px] overflow-hidden">
          {tasksInSlot.map((task, i) => (
             <div key={i} className={`w-full relative group ${task.color} bg-opacity-20 border-l-2 border-white/20 hover:bg-opacity-30`} style={{ height: `${(task.duration/60)*100}%` }}>
                <div className="flex items-center h-full px-4 gap-3">
                    <span className="font-bold text-white text-sm truncate">{task.title}</span>
                    <span className="text-[10px] text-white/50 bg-black/20 px-1.5 rounded">{task.duration}m</span>
                    {task.type === 'break' && <span className="text-[9px] bg-blue-500/50 px-1 rounded uppercase">Break</span>}
                </div>
                <button onClick={() => onRemoveTask(index, task.instanceId)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/40 text-white/70 hover:text-white rounded-full opacity-0 group-hover:opacity-100">×</button>
             </div>
          ))}
          {remaining > 0 && <div className="flex-1"></div>}
       </div>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [view, setView] = useState('session'); // 'session' or 'horizons'
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('backlog'); 
  const [planBaseTime, setPlanBaseTime] = useState(new Date());
  const [targetHours, setTargetHours] = useState(6);
  
  const [tasks, setTasks] = useState(loadData('tasks', [{ id: '1', title: 'Reply to Emails', duration: 15, color: 'bg-blue-400' }]));
  const [templates, setTemplates] = useState(loadData('templates', []));
  const [history, setHistory] = useState(loadData('history', []));
  const [settings, setSettings] = useState(loadData('settings', { zenMode: false, smartBreaks: true }));
  const [monthlyTasks, setMonthlyTasks] = useState(() => loadData('monthlyTasks', {}));

  const [schedule, setSchedule] = useState({});
  const [newTaskInput, setNewTaskInput] = useState("");
  const [suggestions, setSuggestions] = useState([]); 
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  
  const [notification, setNotification] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => saveData('tasks', tasks), [tasks]);
  useEffect(() => saveData('templates', templates), [templates]);
  useEffect(() => saveData('history', history), [history]);
  useEffect(() => saveData('settings', settings), [settings]);
  useEffect(() => saveData('monthlyTasks', monthlyTasks), [monthlyTasks]);

  useEffect(() => {
    if (isSessionActive) return;
    const timer = setInterval(() => setPlanBaseTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isSessionActive]);

  const getCurrentMonthKey = () => {
    const d = new Date();
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const finishTime = new Date(planBaseTime.getTime() + targetHours * 60 * 60 * 1000);

  // --- ACTIONS ---

  const showNotification = (msg, type = 'success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const promoteToBacklog = (taskId, taskTitle) => {
    setTasks(prev => [...prev, { id: Date.now().toString(), title: taskTitle, duration: 60, color: 'bg-emerald-400' }]);
    const currentMonth = getCurrentMonthKey();
    setMonthlyTasks(prev => ({
      ...prev,
      [currentMonth]: prev[currentMonth].filter(t => t.id !== taskId)
    }));
    showNotification("Moved to Backlog!");
  };

  const handleInputChange = (e) => {
      const val = e.target.value;
      setNewTaskInput(val);
      if (val.trim()) {
          const matches = templates.filter(t => t.title.toLowerCase().includes(val.toLowerCase()));
          setSuggestions(matches);
      } else {
          setSuggestions([]);
      }
  };

  const addTaskToBacklog = (taskData) => {
      setTasks([...tasks, { ...taskData, id: Date.now().toString() }]);
      setNewTaskInput("");
      setSuggestions([]);
  };

  const handleAddTask = (e) => { 
      if (e.key === 'Enter' && newTaskInput.trim()) { 
          const exactMatch = templates.find(t => t.title.toLowerCase() === newTaskInput.toLowerCase());
          if (exactMatch) {
              addTaskToBacklog({ title: exactMatch.title, duration: exactMatch.duration, color: exactMatch.color });
          } else {
              addTaskToBacklog({ title: newTaskInput, duration: 60, color: 'bg-emerald-400' }); 
          }
      } 
  };

  const handleSaveTemplate = (taskData) => {
      if (templates.some(t => t.title.toLowerCase() === taskData.title.toLowerCase())) {
          showNotification("Template already exists!", "error");
          return;
      }
      setTemplates([...templates, { ...taskData, id: Date.now().toString() }]);
      showNotification("Saved to Templates!", "success");
  };

  const handleUpdateDuration = (id, change) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, duration: Math.max(1, t.duration + change) } : t)); };
  const handleSetDuration = (id, exactValue) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, duration: Math.max(1, exactValue) } : t)); };
  const handleDeleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
  const handleDeleteTemplate = (id) => setTemplates(prev => prev.filter(t => t.id !== id));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && over.id) {
        const slotIndex = parseInt(over.id.split('-')[1]);
        const task = active.data.current;
        const existing = schedule[slotIndex] || [];
        const used = existing.reduce((acc, t) => acc + t.duration, 0);
        const remaining = 60 - used;
        if (remaining <= 0) return;
        const alloc = Math.min(task.duration, remaining);
        
        const newTaskInstance = { ...task, duration: alloc, sourceTaskId: task.isTemplate ? null : (task.originalId || task.id), instanceId: Date.now() };

        setSchedule(prev => ({ ...prev, [slotIndex]: [...(prev[slotIndex] || []), newTaskInstance] }));
        if (!task.isTemplate) {
            setTasks(prev => prev.map(t => t.id === (task.originalId || task.id) ? { ...t, duration: t.duration - alloc } : t).filter(t => t.duration > 0));
        }
    }
  }

  const handleUnscheduleTask = (slotIndex, instanceId) => {
      const list = schedule[slotIndex] || [];
      const item = list.find(t => t.instanceId === instanceId);
      if (!item) return;
      setSchedule(prev => ({ ...prev, [slotIndex]: list.filter(t => t.instanceId !== instanceId) }));
      if (item.sourceTaskId) {
          setTasks(prev => {
              const exists = prev.find(t => t.id === item.sourceTaskId);
              return exists ? prev.map(t => t.id === exists.id ? { ...t, duration: t.duration + item.duration } : t) : [...prev, { id: item.sourceTaskId, title: item.title, duration: item.duration, color: item.color }];
          });
      }
  };

  const startSession = () => {
    let queue = [];
    for(let i=0; i<targetHours; i++) {
        if(schedule[i] && schedule[i].length > 0) {
            queue.push(...schedule[i]);
        }
    }
    
    if (settings.smartBreaks) {
        const newQueue = [];
        queue.forEach(task => {
            newQueue.push(task);
            if (task.duration >= 60) {
                newQueue.push({ title: "Micro-Break", duration: 5, color: "bg-gray-600", type: 'break', instanceId: Date.now() + Math.random() });
            }
        });
        queue = newQueue;
    }

    if (queue.length > 0) { 
        setPlaylist(queue); 
        setIsSessionActive(true); 
    } else { 
        showNotification("Timeline is empty!", "error"); 
    }
  };

  const handleTaskCompleteRecord = (task) => {
      setHistory(prev => [...prev, { ...task, timestamp: Date.now() }]);
  };

  // --- CONDITIONAL RENDERING ---

  if (isSessionActive && playlist.length > 0) {
      return <FocusMode playlist={playlist} settings={settings} onTaskComplete={handleTaskCompleteRecord} onSessionComplete={() => {}} onExit={() => setIsSessionActive(false)} />;
  }

  if (view === 'horizons') {
      return <HorizonsView onBack={() => setView('session')} monthlyTasks={monthlyTasks} setMonthlyTasks={setMonthlyTasks} />;
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen w-screen bg-gray-900 text-white font-sans overflow-hidden">
        <CustomTitleBar toggleAnalytics={() => setShowAnalytics(true)} toggleSettings={() => setShowSettings(true)} />
        
        {notification && (
            <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4">
                <div className={`px-6 py-3 rounded-full backdrop-blur-xl border shadow-2xl flex items-center gap-3 ${
                    notification.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-200' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
                    <span className="text-sm font-bold tracking-wide">{notification.msg}</span>
                </div>
            </div>
        )}

        {showAnalytics && <AnalyticsView history={history} onClose={() => setShowAnalytics(false)} />}
        {showSettings && <SettingsView settings={settings} onUpdate={(k, v) => setSettings(prev => ({...prev, [k]: v}))} onClose={() => setShowSettings(false)} />}

        <div className="flex-1 flex overflow-hidden">
            <div className={`${isSidebarOpen ? 'w-80 opacity-100 p-6' : 'w-0 opacity-0 p-0'} h-full flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-2xl transition-all duration-300`}>
                
                {/* HORIZONS ENTRY BUTTON */}
                <button 
                    onClick={() => setView('horizons')}
                    className="w-full mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 hover:border-indigo-400/50 flex items-center justify-between group transition-all"
                >
                    <div className="text-left">
                        <div className="text-sm font-bold text-indigo-200">Plan Horizons</div>
                        <div className="text-[10px] text-indigo-200/50">Manage future tasks</div>
                    </div>
                    <span className="text-indigo-200 group-hover:translate-x-1 transition-transform">→</span>
                </button>

                {/* MONTHLY MINI-OVERVIEW */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                        {getCurrentMonthKey()}
                    </h3>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {(monthlyTasks[getCurrentMonthKey()] || []).length === 0 ? (
                            <div className="text-white/20 text-[10px] italic">No tasks set for this month.</div>
                        ) : (
                            (monthlyTasks[getCurrentMonthKey()] || []).map(t => (
                                <div key={t.id} className="flex items-center justify-between bg-emerald-900/10 border border-emerald-500/20 p-2 rounded-lg group">
                                    <span className="text-[11px] text-emerald-100/80 truncate max-w-[140px]">{t.title}</span>
                                    <button 
                                        onClick={() => promoteToBacklog(t.id, t.title)}
                                        className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500 hover:text-white transition-colors"
                                    >
                                        + Add
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-4 mb-4">
                    <button onClick={() => setSidebarTab('backlog')} className={`text-xs font-bold uppercase tracking-wider ${sidebarTab==='backlog' ? 'text-white' : 'text-white/30'}`}>Backlog</button>
                    <button onClick={() => setSidebarTab('saved')} className={`text-xs font-bold uppercase tracking-wider ${sidebarTab==='saved' ? 'text-white' : 'text-white/30'}`}>Saved</button>
                    <button onClick={() => setSidebarTab('logbook')} className={`text-xs font-bold uppercase tracking-wider ${sidebarTab==='logbook' ? 'text-white' : 'text-white/30'}`}>Logbook</button>
                </div>

                {sidebarTab === 'backlog' && (
                    <>
                    <div className="mb-6 relative">
                        <input type="text" value={newTaskInput} onChange={handleInputChange} onKeyDown={handleAddTask} placeholder="Add task..." className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="text-[10px] uppercase font-bold text-white/30 px-3 py-2 bg-black/20">Suggestions</div>
                                {suggestions.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => addTaskToBacklog({ title: s.title, duration: s.duration, color: s.color })}
                                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 flex justify-between group"
                                    >
                                        <span>{s.title}</span>
                                        <span className="text-white/40 text-xs group-hover:text-white/70">{s.duration}m</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-3 overflow-y-auto flex-1 pb-4">
                        {tasks.map(task => (<DraggableTask key={task.id} {...task} onUpdateDuration={handleUpdateDuration} onSetDuration={handleSetDuration} onDelete={handleDeleteTask} onSaveTemplate={handleSaveTemplate} />))}
                    </div>
                    </>
                )}

                {sidebarTab === 'saved' && (
                     <div className="space-y-3 overflow-y-auto flex-1 pb-4">
                        <div className="text-xs text-white/30 text-center mb-4">Drag saved tasks to timeline</div>
                        {templates.map(task => (<DraggableTask key={task.id} {...task} onDelete={handleDeleteTemplate} isTemplate={true} />))}
                     </div>
                )}

                {sidebarTab === 'logbook' && (
                     <div className="space-y-3 overflow-y-auto flex-1 pb-4">
                        {history.slice().reverse().map((h, i) => (
                             <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between">
                                 <div>
                                    <div className="text-sm font-medium text-white/70 line-through decoration-emerald-500/50">{h.title}</div>
                                    <div className="text-[10px] text-white/30">{new Date(h.timestamp).toLocaleDateString()}</div>
                                 </div>
                                 <div className="text-xs text-emerald-400 font-bold">{h.duration}m</div>
                             </div>
                        ))}
                     </div>
                )}
            </div>
            
            <div className="flex-1 h-full flex flex-col relative bg-black/20">
                <div className="h-20 border-b border-white/5 flex items-center px-8 bg-white/5 backdrop-blur-sm justify-between">
                    <div className="flex items-center gap-6">
                        {!isSidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg text-white/50">☰</button>}
                        <div><h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Session Plan</h1><p className="text-xs text-emerald-400 mt-1 font-mono tracking-wide">Est. Finish: {finishTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5"><span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Duration</span><input type="number" min="1" max="12" value={targetHours} onChange={(e) => setTargetHours(parseInt(e.target.value) || 1)} className="w-8 bg-transparent text-sm font-bold text-center focus:outline-none" /><span className="text-sm font-bold text-white">Hrs</span></div>
                        <button onClick={startSession} className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all transform hover:scale-105">Start Session ▶</button>
                    </div>
                </div>
                <div className="flex-1 p-8 pl-32 overflow-y-auto space-y-6">
                    {Array.from({ length: targetHours }).map((_, index) => {
                        const slotStartTime = new Date(planBaseTime.getTime() + index * 60 * 60 * 1000);
                        const slotEndTime = new Date(slotStartTime.getTime() + 60 * 60 * 1000);
                        return (<TimelineSlot key={index} index={index} startTime={slotStartTime} endTime={slotEndTime} tasksInSlot={schedule[index] || []} onRemoveTask={handleUnscheduleTask} />);
                    })}
                    <div className="h-20"></div>
                </div>
            </div>
        </div>
      </div>
    </DndContext>
  );
}

export default App;