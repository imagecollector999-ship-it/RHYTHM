import { useEffect, useRef, useState } from 'react';
import { Effect } from '../types';

interface EffectsOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  effects: Effect[];
}

export function EffectsOverlay({ videoRef, effects }: EffectsOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef(0);
  const activeEffectsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let animationFrameId: number;

    const checkEffects = () => {
      const video = videoRef.current;
      if (!video) {
        animationFrameId = requestAnimationFrame(checkEffects);
        return;
      }

      const currentTime = video.currentTime;

      if (currentTime < lastTimeRef.current) {
        activeEffectsRef.current.clear();
      }

      effects.forEach((effect, index) => {
        const effectId = `${index}-${effect.time}`;

        if (
          effect.time > lastTimeRef.current &&
          effect.time <= currentTime &&
          !activeEffectsRef.current.has(effectId)
        ) {
          activeEffectsRef.current.add(effectId);
          triggerEffect(effect);
        }
      });

      lastTimeRef.current = currentTime;
      animationFrameId = requestAnimationFrame(checkEffects);
    };

    animationFrameId = requestAnimationFrame(checkEffects);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [effects, videoRef]);

  const triggerEffect = (effect: Effect) => {
    if (!overlayRef.current) return;

    switch (effect.type) {
      case 'heart':
        createHeartEffect();
        break;
      case 'flash':
        createFlashEffect();
        break;
      case 'text':
        createTextEffect(effect.text || 'BOOM!');
        break;
    }
  };

  const createHeartEffect = () => {
    if (!overlayRef.current) return;

    const el = document.createElement('div');
    el.className = 'effect-heart';
    el.innerHTML = '💖';
    overlayRef.current.appendChild(el);
    setTimeout(() => {
      if (overlayRef.current?.contains(el)) {
        overlayRef.current.removeChild(el);
      }
    }, 1000);
  };

  const createFlashEffect = () => {
    if (!overlayRef.current) return;

    const el = document.createElement('div');
    el.className = 'effect-flash';
    overlayRef.current.appendChild(el);
    setTimeout(() => {
      if (overlayRef.current?.contains(el)) {
        overlayRef.current.removeChild(el);
      }
    }, 400);
  };

  const createTextEffect = (text: string) => {
    if (!overlayRef.current) return;

    const el = document.createElement('div');
    el.className = 'effect-text';
    el.textContent = text;
    overlayRef.current.appendChild(el);
    setTimeout(() => {
      if (overlayRef.current?.contains(el)) {
        overlayRef.current.removeChild(el);
      }
    }, 1500);
  };

  return (
    <div
      ref={overlayRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-10"
    />
  );
}
