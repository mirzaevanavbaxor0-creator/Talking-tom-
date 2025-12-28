
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import Tom3D from './components/Tom3D';
import { TomState, Blob, GameMode } from './types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, VOICE_NAME } from './constants';

// Mini games
import MemoryGame from './components/minigames/MemoryGame';
import RhythmGame from './components/minigames/RhythmGame';
import PuzzleGame from './components/minigames/PuzzleGame';

const App: React.FC = () => {
  const [tomState, setTomState] = useState<TomState>(TomState.IDLE);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.MAIN);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts for Gemini Live
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const stopSession = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    sessionPromiseRef.current = null;
    setIsMicOn(false);
    setTomState(TomState.IDLE);
  }, []);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live session opened');
            setIsMicOn(true);
            setIsConnecting(false);

            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            
            if (base64EncodedAudioString) {
              setTomState(TomState.TALKING);
              const outputCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputCtx,
                24000,
                1
              );
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setTomState(TomState.IDLE);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setTomState(TomState.IDLE);
            }
          },
          onerror: (e) => {
            console.error('Gemini error:', e);
            setError("Connection error. Try again.");
            stopSession();
          },
          onclose: () => {
            console.log('Session closed');
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
      setError("Permission denied or microphone missing.");
      setIsConnecting(false);
    }
  };

  const handlePoke = () => {
    setTomState(TomState.SURPRISED);
    setTimeout(() => setTomState(TomState.IDLE), 1000);
  };

  const handleFeed = () => {
    setTomState(TomState.EATING);
    setTimeout(() => setTomState(TomState.HAPPY), 1500);
    setTimeout(() => setTomState(TomState.IDLE), 3000);
  };

  const handleMeow = () => {
    setTomState(TomState.TALKING);
    setTimeout(() => setTomState(TomState.IDLE), 2000);
  };

  const renderGame = () => {
    switch (gameMode) {
      case GameMode.MEMORY:
        return <MemoryGame onBack={() => setGameMode(GameMode.MAIN)} />;
      case GameMode.RHYTHM:
        return <RhythmGame onBack={() => setGameMode(GameMode.MAIN)} />;
      case GameMode.PUZZLE:
        return <PuzzleGame onBack={() => setGameMode(GameMode.MAIN)} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-end pb-12">
      <Tom3D state={tomState} />

      {/* Mini Games Layer */}
      {renderGame()}

      {/* UI Overlay */}
      <div className={`z-10 w-full max-w-md px-6 flex flex-col items-center gap-6 transition-opacity duration-500 ${gameMode !== GameMode.MAIN ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Games Menu */}
        <div className="flex gap-2 w-full">
           <button onClick={() => setGameMode(GameMode.MEMORY)} className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl py-2 text-white text-xs font-bold border border-white/10">🧠 MEMORY</button>
           <button onClick={() => setGameMode(GameMode.RHYTHM)} className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl py-2 text-white text-xs font-bold border border-white/10">🎵 RHYTHM</button>
           <button onClick={() => setGameMode(GameMode.PUZZLE)} className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl py-2 text-white text-xs font-bold border border-white/10">🧩 PUZZLE</button>
        </div>

        {/* Status indicator */}
        <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-1 flex items-center gap-2 border border-white/30">
            <div className={`w-3 h-3 rounded-full ${isMicOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-white font-medium text-sm">
                {isConnecting ? 'Connecting...' : isMicOn ? 'Tom is listening' : 'Tom is idle'}
            </span>
        </div>

        {error && (
            <div className="bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm mb-4">
                {error}
            </div>
        )}

        {/* Main Interaction Buttons */}
        <div className="grid grid-cols-3 gap-4 w-full">
          <button 
            onClick={handlePoke}
            className="flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-4 shadow-xl transition-all active:scale-95"
          >
            <span className="text-2xl mb-1">👆</span>
            <span className="text-xs font-bold uppercase">Poke</span>
          </button>

          <button 
            onClick={isMicOn ? stopSession : startSession}
            disabled={isConnecting}
            className={`flex flex-col items-center justify-center ${isMicOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-2xl p-4 shadow-xl transition-all active:scale-95 border-4 ${isMicOn ? 'border-red-300' : 'border-green-300'}`}
          >
            <span className="text-2xl mb-1">{isMicOn ? '⏹️' : '🎙️'}</span>
            <span className="text-xs font-bold uppercase">{isMicOn ? 'Stop' : 'Talk'}</span>
          </button>

          <button 
            onClick={handleFeed}
            className="flex flex-col items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-4 shadow-xl transition-all active:scale-95"
          >
            <span className="text-2xl mb-1">🍗</span>
            <span className="text-xs font-bold uppercase">Feed</span>
          </button>
        </div>

        <button 
          onClick={handleMeow}
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl py-2 font-bold uppercase tracking-widest text-sm transition-colors"
        >
          Meow!
        </button>
      </div>

      <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
        <h1 className="text-4xl font-black text-white drop-shadow-lg italic">TALKING TOM AI</h1>
        <p className="text-white/80 font-medium">Modern 3D Interactive Cat</p>
      </div>
    </div>
  );
};

export default App;
