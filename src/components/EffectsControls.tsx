import { useState } from 'react';
import { Heart, Zap, Type } from 'lucide-react';
import { Effect } from '../types';

interface EffectsControlsProps {
  currentTime: number;
  onAddEffect: (effect: Omit<Effect, 'time'> & { time?: number }) => void;
}

export function EffectsControls({ currentTime, onAddEffect }: EffectsControlsProps) {
  const [selectedText, setSelectedText] = useState('BOOM!');

  const textOptions = [
    'BOOM!',
    'WOW!',
    'AMAZING!',
    '💥 KABOOM! 💥',
    'PERFECT!',
    'NICE!',
    'COOL!'
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
      <h3 className="text-sm font-bold text-neutral-300">Visual Effects</h3>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAddEffect({ type: 'heart' })}
          className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Heart size={16} fill="currentColor" /> Heart
        </button>

        <button
          onClick={() => onAddEffect({ type: 'flash' })}
          className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Zap size={16} fill="currentColor" /> Flash
        </button>

        <button
          onClick={() => onAddEffect({ type: 'text', text: selectedText })}
          className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Type size={16} /> Text
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-neutral-400">Text message:</label>
        <select
          value={selectedText}
          onChange={(e) => setSelectedText(e.target.value)}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1 text-sm"
        >
          {textOptions.map((text) => (
            <option key={text} value={text}>
              {text}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
