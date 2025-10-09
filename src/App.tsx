import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Upload, Plus, Trash2, Video } from 'lucide-react';
import { EffectsOverlay } from './components/EffectsOverlay';
import { EffectsControls } from './components/EffectsControls';
import { Chart, Effect, Note } from './types';

const DEFAULT_CHART: Chart = {
  bpm: 120,
  sections: [{ start: 0, playbackRate: 1 }],
  notes: [{ time: 0.5 }, { time: 1.0 }, { time: 2.0 }, { time: 3.5 }],
  effects: []
};

function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'editor'>('player');
  const [chart, setChart] = useState<Chart>(DEFAULT_CHART);
  const [previewMultiplier, setPreviewMultiplier] = useState(1);
  const [forcedPlayback, setForcedPlayback] = useState('');
  const [baseSpeed, setBaseSpeed] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const dragRef = useRef<{ noteObj: Note; startX: number } | null>(null);
  const effectDragRef = useRef<{ effectObj: Effect; startX: number } | null>(null);

  const pixelsPerSecond = 120;

  const getDuration = () => {
    const lastNote = chart.notes.length ? Math.max(...chart.notes.map(n => n.time)) : 4;
    const lastSection = chart.sections.length ? Math.max(...chart.sections.map(s => s.start)) : 0;
    return Math.max(lastNote + 2, lastSection + 2, 4);
  };

  const getPlaybackAtTime = (t: number) => {
    let p = chart.sections[0]?.playbackRate ?? 1;
    const secs = [...chart.sections].sort((a, b) => a.start - b.start);
    for (const s of secs) {
      if (t >= s.start) p = s.playbackRate;
      else break;
    }
    return p;
  };

  const smoothSetPlaybackRate = (target: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = Math.max(0.25, Math.min(4, target));
    }
  };

  const applyPlaybackRateForTime = (t: number) => {
    if (forcedPlayback !== '') {
      smoothSetPlaybackRate(Number(forcedPlayback));
      return;
    }
    const baseRate = getPlaybackAtTime(t);
    const target = baseRate * previewMultiplier;
    smoothSetPlaybackRate(target);
  };

  const updatePlayhead = () => {
    const video = videoRef.current;
    if (!video || !playheadRef.current) return;

    const t = video.currentTime;
    const left = t * pixelsPerSecond;
    playheadRef.current.style.left = `${left}px`;

    if (timelineRef.current && activeTab === 'editor') {
      const visibleLeft = timelineRef.current.scrollLeft;
      const visibleRight = visibleLeft + timelineRef.current.offsetWidth;
      if (left < visibleLeft + 80) timelineRef.current.scrollLeft = Math.max(0, left - 80);
      if (left > visibleRight - 80) timelineRef.current.scrollLeft = left - (timelineRef.current.offsetWidth - 80);
    }
  };

  const renderGame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = video.currentTime;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    const base = baseSpeed;
    chart.notes.forEach(n => {
      const pr = getPlaybackAtTime(n.time);
      const speedPx = base * pr * previewMultiplier;
      const dx = (n.time - t) * speedPx;
      const x = cx + dx;
      if (x < -40 || x > canvas.width + 40) return;

      ctx.beginPath();
      ctx.arc(x, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ddd';
      ctx.fill();

      if (Math.abs(dx) < 6) {
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,68,196,0.95)';
        ctx.lineWidth = 5;
        ctx.stroke();
      }
    });

    updatePlayhead();

    if (!video.paused && !video.ended) {
      applyPlaybackRateForTime(t);
      rafRef.current = requestAnimationFrame(renderGame);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      applyPlaybackRateForTime(video.currentTime);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(renderGame);
    };

    const onPause = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };

    const onSeeked = () => {
      applyPlaybackRateForTime(video.currentTime);
      updatePlayhead();
      if (video.paused && activeTab === 'player') renderGame();
    };

    const onTimeUpdate = () => {
      if (activeTab === 'editor') {
        updatePlayhead();
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', onTimeUpdate);

    if (videoUrl && video.paused && activeTab === 'player') {
      renderGame();
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [chart, previewMultiplier, forcedPlayback, baseSpeed, activeTab, videoUrl]);

  const handleAddNote = () => {
    const last = chart.notes.length ? Math.max(...chart.notes.map(n => n.time)) : 0;
    setChart(prev => ({
      ...prev,
      notes: [...prev.notes, { time: last + 0.5 }].sort((a, b) => a.time - b.time)
    }));
  };

  const handleAddSection = () => {
    const start = parseFloat(prompt('Section start (s):', '0') || '0');
    const rate = parseFloat(prompt('Playback rate:', '1') || '1');
    if (!isNaN(start) && !isNaN(rate)) {
      setChart(prev => ({
        ...prev,
        sections: [...prev.sections, { start, playbackRate: rate }].sort((a, b) => a.start - b.start)
      }));
    }
  };

  const handleClear = () => {
    setChart({
      bpm: 120,
      sections: [{ start: 0, playbackRate: 1 }],
      notes: [],
      effects: []
    });
  };

  const handleAddEffect = (effect: Omit<Effect, 'time'> & { time?: number }) => {
    const time = effect.time ?? (videoRef.current?.currentTime || 0);
    setChart(prev => ({
      ...prev,
      effects: [...prev.effects, { ...effect, time } as Effect].sort((a, b) => a.time - b.time)
    }));
  };

  const handleRemoveEffect = (index: number) => {
    setChart(prev => ({
      ...prev,
      effects: prev.effects.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveNote = (index: number) => {
    setChart(prev => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index)
    }));
  };

  const handleEffectPointerDown = (e: React.PointerEvent<HTMLDivElement>, effect: Effect) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    effectDragRef.current = { effectObj: effect, startX: e.clientX };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleEffectPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!effectDragRef.current || !timelineRef.current) return;
    const rect = (timelineRef.current.children[0] as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(x / pixelsPerSecond, getDuration()));
    effectDragRef.current.effectObj.time = newTime;
    setChart(prev => ({ ...prev }));
  };

  const handleEffectPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!effectDragRef.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    effectDragRef.current = null;
    setIsDragging(false);
    setChart(prev => ({
      ...prev,
      effects: [...prev.effects].sort((a, b) => a.time - b.time)
    }));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(chart, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chart.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        setChart(parsed);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        renderGame();
        updatePlayhead();
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || (e.target as HTMLElement).classList.contains('note')) return;
    const rect = (e.currentTarget.children[0] as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, getDuration()));
    setChart(prev => ({
      ...prev,
      notes: [...prev.notes, { time }].sort((a, b) => a.time - b.time)
    }));
  };

  const handleNotePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = { noteObj: note, startX: e.clientX };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleNotePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !timelineRef.current) return;
    const rect = (timelineRef.current.children[0] as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(x / pixelsPerSecond, getDuration()));
    dragRef.current.noteObj.time = newTime;
    setChart(prev => ({ ...prev }));
  };

  const handleNotePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setIsDragging(false);
    setChart(prev => ({
      ...prev,
      notes: [...prev.notes].sort((a, b) => a.time - b.time)
    }));
  };

  const duration = getDuration();
  const timelineWidth = Math.max(600, Math.ceil(duration * pixelsPerSecond));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-b from-neutral-900 to-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('player')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'player'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Player
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Editor
          </button>
        </div>
        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer">
          <Video size={18} /> Upload Video
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
        </label>
      </div>

      <main className="p-4 flex justify-center">
        {activeTab === 'player' ? (
          <div className="w-full max-w-[920px] bg-neutral-900 rounded-xl p-4 shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="relative">
                {videoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full rounded-lg"
                      controls
                      preload="auto"
                      src={videoUrl}
                    />
                    <EffectsOverlay videoRef={videoRef} effects={chart.effects} />
                  </>
                ) : (
                  <div className="w-full aspect-video rounded-lg bg-neutral-800 border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center gap-3">
                    <Video size={64} className="text-neutral-600" />
                    <p className="text-neutral-400 font-semibold">No video loaded</p>
                    <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer">
                      <Upload size={20} /> Upload Video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <canvas
                ref={canvasRef}
                width={880}
                height={300}
                className="w-full rounded-lg bg-black"
              />

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => videoRef.current?.play()}
                  className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                  <Play size={18} /> Play
                </button>
                <button
                  onClick={() => videoRef.current?.pause()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold flex items-center gap-2 transition-colors border border-neutral-700"
                >
                  <Pause size={18} /> Pause
                </button>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-400">Speed multiplier</label>
                  <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.05"
                    value={previewMultiplier}
                    onChange={(e) => setPreviewMultiplier(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-neutral-300">{previewMultiplier.toFixed(2)}x</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-400">Force playback</label>
                  <select
                    value={forcedPlayback}
                    onChange={(e) => setForcedPlayback(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1 text-sm"
                  >
                    <option value="">(auto by sections)</option>
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                <button
                  onClick={handleExport}
                  className="ml-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold flex items-center gap-2 transition-colors border border-neutral-700"
                >
                  <Download size={18} /> Export
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[920px] bg-neutral-900 rounded-xl p-4 shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="relative">
                {videoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full rounded-lg"
                      controls
                      preload="auto"
                      src={videoUrl}
                    />
                    <EffectsOverlay videoRef={videoRef} effects={chart.effects} />
                  </>
                ) : (
                  <div className="w-full aspect-video rounded-lg bg-neutral-800 border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center gap-3">
                    <Video size={64} className="text-neutral-600" />
                    <p className="text-neutral-400 font-semibold">No video loaded</p>
                    <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer">
                      <Upload size={20} /> Upload Video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <EffectsControls
                currentTime={videoRef.current?.currentTime || 0}
                onAddEffect={handleAddEffect}
              />

              <div className="flex flex-wrap gap-3 items-center text-sm">
                <div className="flex items-center gap-2">
                  <label className="text-neutral-400">BPM</label>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="1"
                    value={chart.bpm}
                    onChange={(e) => setChart(prev => ({ ...prev, bpm: Number(e.target.value) }))}
                    className="w-24"
                  />
                  <span className="text-neutral-300 w-10">{chart.bpm}</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-neutral-400">Base speed</label>
                  <input
                    type="range"
                    min="80"
                    max="800"
                    step="10"
                    value={baseSpeed}
                    onChange={(e) => setBaseSpeed(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-neutral-300 w-10">{baseSpeed}</span>
                </div>

                <div className="ml-auto flex gap-2">
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                    <Plus size={16} /> Note
                  </button>
                  <button
                    onClick={handleAddSection}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold flex items-center gap-2 transition-colors border border-neutral-700"
                  >
                    <Plus size={16} /> Section
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold flex items-center gap-2 transition-colors border border-neutral-700"
                  >
                    <Trash2 size={16} /> Clear
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold flex items-center gap-2 transition-colors border border-neutral-700"
                  >
                    <Download size={16} /> Export
                  </button>
                  <label className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-bold flex items-center gap-2 transition-colors border border-neutral-700 cursor-pointer">
                    <Upload size={16} /> Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="bg-black rounded-lg h-28 overflow-auto relative border border-neutral-800 cursor-crosshair"
              >
                <div className="relative h-24" style={{ width: `${timelineWidth}px` }}>
                  {chart.sections.sort((a, b) => a.start - b.start).map((section, idx) => {
                    const nextSection = chart.sections.sort((a, b) => a.start - b.start)[idx + 1];
                    const startPx = section.start * pixelsPerSecond;
                    const endPx = (nextSection?.start ?? duration) * pixelsPerSecond;
                    return (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newRate = parseFloat(prompt('Playback rate:', String(section.playbackRate)) || String(section.playbackRate));
                          if (!isNaN(newRate)) {
                            section.playbackRate = newRate;
                            setChart(prev => ({ ...prev }));
                          }
                        }}
                        className="absolute top-0 h-6 bg-gradient-to-r from-neutral-800/40 to-transparent text-neutral-400 text-xs leading-6 pl-2 border-l border-neutral-700 cursor-pointer hover:bg-neutral-800/60 transition-colors"
                        style={{
                          left: `${startPx}px`,
                          width: `${Math.max(24, endPx - startPx)}px`
                        }}
                        title={`${section.start.toFixed(2)}s • ${section.playbackRate}x`}
                      >
                        {section.playbackRate}x
                      </div>
                    );
                  })}

                  {chart.notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="note-container absolute bottom-0 h-full group"
                      style={{
                        left: `${note.time * pixelsPerSecond}px`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div
                        onPointerDown={(e) => handleNotePointerDown(e, note)}
                        onPointerMove={handleNotePointerMove}
                        onPointerUp={handleNotePointerUp}
                        className="note w-2 h-full bg-pink-500 rounded-sm cursor-grab active:cursor-grabbing hover:bg-pink-400 transition-colors"
                        title={`${note.time.toFixed(3)}s`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNote(idx);
                        }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {chart.effects.map((effect, idx) => (
                    <div
                      key={idx}
                      className="effect-container absolute top-6 group"
                      style={{
                        left: `${effect.time * pixelsPerSecond}px`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div
                        onPointerDown={(e) => handleEffectPointerDown(e, effect)}
                        onPointerMove={handleEffectPointerMove}
                        onPointerUp={handleEffectPointerUp}
                        className={`w-3 h-3 rounded-full cursor-grab active:cursor-grabbing transition-all shadow-lg ${
                          effect.type === 'heart' ? 'bg-red-500 hover:bg-red-400' :
                          effect.type === 'flash' ? 'bg-yellow-500 hover:bg-yellow-400' :
                          'bg-cyan-500 hover:bg-cyan-400'
                        }`}
                        title={`${effect.time.toFixed(2)}s - ${effect.type}${effect.text ? `: ${effect.text}` : ''}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEffect(idx);
                        }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <div
                    ref={playheadRef}
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-50"
                    style={{ left: 0 }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-neutral-400 block mb-2">Chart JSON</label>
                <textarea
                  value={JSON.stringify(chart, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setChart(parsed);
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="w-full h-32 bg-black text-neutral-300 rounded-lg p-3 border border-neutral-800 font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
