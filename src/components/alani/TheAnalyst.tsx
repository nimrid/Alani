'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AlaniEvent, EventType } from '@/store/matchStore';

interface TheAnalystProps {
  eventQueue: AlaniEvent[];
  isReplayMode: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type FaceState = 'idle' | 'talking' | 'surprised' | 'nodding';

export function TheAnalyst({ eventQueue, isReplayMode, collapsed, onToggleCollapse }: TheAnalystProps) {
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const [currentText, setCurrentText] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const queueRef = useRef<AlaniEvent[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const faceStateRef = useRef<FaceState>('idle');
  const lastAmplitudeSwitchRef = useRef<number>(0);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Track processed events to avoid re-speaking
  const processedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Look for new events to add to queue
    const newEvents = eventQueue.filter(ev => 
      ev.narratedText && !processedEventsRef.current.has(ev.id)
    );
    
    if (newEvents.length > 0) {
      newEvents.reverse().forEach(ev => {
        processedEventsRef.current.add(ev.id);
        queueRef.current.push(ev);
      });
      
      // Keep max queue depth of 2 (discard older ones)
      if (queueRef.current.length > 2) {
        queueRef.current = queueRef.current.slice(queueRef.current.length - 2);
      }
      
      processQueue();
    }
  }, [eventQueue]);

  const processQueue = async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;
    
    const event = queueRef.current.shift()!;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentText(event.narratedText);
    
    // Initial face state
    if (event.type === 'GOAL' || event.type === 'OWN_GOAL') {
      changeFaceState('surprised');
      setTimeout(() => {
        if (isPlayingRef.current) changeFaceState('talking');
      }, 800);
    } else {
      changeFaceState('talking');
    }
    
    try {
      const response = await fetch('/api/analyst/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: event.narratedText, eventType: event.type })
      });
      
      if (!response.ok) throw new Error('TTS Failed');
      
      await playAudioStream(response);
    } catch (error) {
      console.error('ElevenLabs failed, falling back to SpeechSynthesis', error);
      fallbackToBrowserTTS(event.narratedText);
    }
  };

  const changeFaceState = (state: FaceState) => {
    faceStateRef.current = state;
    setFaceState(state);
  };

  const playAudioStream = async (response: Response) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') await audioContext.resume();
    
    if (!response.body) throw new Error('No response body');
    
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    sourceRef.current = source;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const pollAmplitude = () => {
      if (!isPlayingRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const amplitude = sum / dataArray.length / 255;
      
      const now = Date.now();
      if (now - lastAmplitudeSwitchRef.current > 80) { // 80ms debounce
        if (amplitude > 0.15 && faceStateRef.current !== 'surprised') {
          changeFaceState('talking');
          lastAmplitudeSwitchRef.current = now;
        } else if (amplitude <= 0.15 && faceStateRef.current === 'talking') {
          changeFaceState('idle');
          lastAmplitudeSwitchRef.current = now;
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(pollAmplitude);
    };
    
    source.start();
    pollAmplitude();
    
    return new Promise<void>((resolve) => {
      source.onended = () => {
        handleAudioEnd();
        resolve();
      };
    });
  };

  const fallbackToBrowserTTS = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthRef.current = utterance;
    
    // Simulate talking animation for browser TTS since we don't have audio data
    const interval = setInterval(() => {
      if (!isPlayingRef.current) {
        clearInterval(interval);
        return;
      }
      const now = Date.now();
      if (now - lastAmplitudeSwitchRef.current > 150) {
        if (faceStateRef.current !== 'surprised') {
           const nextState = faceStateRef.current === 'talking' ? 'idle' : 'talking';
           changeFaceState(nextState);
           lastAmplitudeSwitchRef.current = now;
        }
      }
    }, 150);
    
    utterance.onend = () => {
      clearInterval(interval);
      handleAudioEnd();
    };
    
    synth.speak(utterance);
  };

  const handleAudioEnd = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    changeFaceState('nodding');
    setTimeout(() => {
      changeFaceState('idle');
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentText('');
      processQueue();
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (speechSynthRef.current) window.speechSynthesis.cancel();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const getImagePath = () => {
    switch (faceState) {
      case 'talking': return '/analyst/analyst-talking.png';
      case 'surprised': return '/analyst/analyst-surprised.png';
      case 'nodding': return '/analyst/analyst-nodding.png';
      default: return '/analyst/analyst-idle.png';
    }
  };

  return (
    <div 
      className={`fixed z-50 transition-transform duration-300 ease-out ${isReplayMode ? 'translate-x-0' : 'translate-x-[200%]'}`}
      style={{ bottom: collapsed ? '16px' : '80px', right: '16px' }}
    >
      {collapsed ? (
        <div 
          className="relative w-16 h-16 rounded-full overflow-hidden cursor-pointer shadow-lg border-2 border-border-subtle"
          onClick={onToggleCollapse}
        >
          {isPlaying && (
            <div className="absolute inset-0 rounded-full animate-ping border-2 border-chain-purple opacity-75" />
          )}
          <img 
            src={getImagePath()} 
            alt="The Analyst" 
            className="w-full h-full object-cover relative z-10"
          />
        </div>
      ) : (
        <div 
          className="w-[180px] bg-bg-elevated rounded-[12px] p-3 flex flex-col items-center relative"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
        >
          <button 
            onClick={onToggleCollapse}
            className="absolute top-2 right-2 text-text-muted hover:text-text-base text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ×
          </button>
          
          <div className="w-[160px] h-[200px] rounded overflow-hidden bg-black/20 mb-2">
            <img 
              src={getImagePath()} 
              alt="The Analyst" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="text-[var(--text-xs)] text-text-muted font-bold tracking-wider mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            THE ANALYST
          </div>
          
          <div className="w-full h-[1px] bg-border-subtle mb-2" />
          
          <div className="w-full min-h-[48px] flex items-center justify-center">
            {currentText && (
              <p 
                className="text-[var(--text-xs)] text-center animate-in fade-in duration-500 line-clamp-3 text-text-base"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {currentText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
