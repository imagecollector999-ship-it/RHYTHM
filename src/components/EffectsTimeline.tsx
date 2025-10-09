import { Effect } from '../types';
import { Heart, Zap, Type } from 'lucide-react';

interface EffectsTimelineProps {
  effects: Effect[];
  duration: number;
  pixelsPerSecond: number;
  onRemoveEffect: (index: number) => void;
}

export function EffectsTimeline({
  effects,
  duration,
  pixelsPerSecond,
  onRemoveEffect
}: EffectsTimelineProps) {
  const getEffectIcon = (type: Effect['type']) => {
    switch (type) {
      case 'heart':
        return <Heart size={12} fill="currentColor" />;
      case 'flash':
        return <Zap size={12} fill="currentColor" />;
      case 'text':
        return <Type size={12} />;
    }
  };

  const getEffectColor = (type: Effect['type']) => {
    switch (type) {
      case 'heart':
        return 'bg-red-500 hover:bg-red-400';
      case 'flash':
        return 'bg-yellow-500 hover:bg-yellow-400';
      case 'text':
        return 'bg-cyan-500 hover:bg-cyan-400';
    }
  };

  return (
    <>
      {effects.map((effect, idx) => (
        <div
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveEffect(idx);
          }}
          className={`absolute top-6 w-3 h-3 rounded-full cursor-pointer transition-all ${getEffectColor(effect.type)} flex items-center justify-center shadow-lg`}
          style={{
            left: `${effect.time * pixelsPerSecond}px`,
            transform: 'translateX(-50%)'
          }}
          title={`${effect.time.toFixed(2)}s - ${effect.type}${effect.text ? `: ${effect.text}` : ''}`}
        >
          <span className="text-white text-[8px]">
            {getEffectIcon(effect.type)}
          </span>
        </div>
      ))}
    </>
  );
}
