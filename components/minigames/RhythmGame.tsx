
import React, { useState, useEffect, useRef } from 'react';

interface Note {
  id: number;
  lane: number;
  y: number;
}

const RhythmGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [combo, setCombo] = useState(0);
  const gameLoopRef = useRef<number>(null);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    const loop = (time: number) => {
      // Spawn new note
      if (time - lastSpawnRef.current > 800) {
        setNotes(prev => [
          ...prev,
          { id: Math.random(), lane: Math.floor(Math.random() * 4), y: -50 }
        ]);
        lastSpawnRef.current = time;
      }

      // Update positions
      setNotes(prev => {
        const updated = prev.map(n => ({ ...n, y: n.y + 4 }));
        // Filter out missed notes
        const filtered = updated.filter(n => {
            if (n.y > 550) {
                setCombo(0);
                return false;
            }
            return true;
        });
        return filtered;
      });

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current!);
  }, []);

  const handleHit = (lane: number) => {
    setNotes(prev => {
      let hit = false;
      const updated = prev.filter(n => {
        if (n.lane === lane && n.y > 400 && n.y < 500) {
          hit = true;
          return false;
        }
        return true;
      });

      if (hit) {
        setScore(s => s + 100 + (combo * 10));
        setCombo(c => c + 1);
      } else {
        setCombo(0);
      }
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-fuchsia-900/90 backdrop-blur-lg flex flex-col items-center justify-center">
      <div className="absolute top-8 left-8">
         <button onClick={onBack} className="text-white bg-white/10 px-6 py-3 rounded-2xl font-bold hover:bg-white/20">EXIT</button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-white italic">TOM'S BEAT</h2>
        <div className="text-yellow-400 text-2xl font-bold">SCORE: {score}</div>
        <div className="text-fuchsia-300 font-bold">COMBO x{combo}</div>
      </div>

      <div className="relative w-80 h-[500px] bg-black/40 rounded-3xl overflow-hidden border-4 border-white/20">
        {/* Lanes */}
        <div className="absolute inset-0 grid grid-cols-4 divide-x divide-white/10">
          {[0, 1, 2, 3].map(i => <div key={i} />)}
        </div>

        {/* Target Line */}
        <div className="absolute bottom-16 w-full h-1 bg-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]" />

        {/* Notes */}
        {notes.map(note => (
          <div
            key={note.id}
            className="absolute w-16 h-16 bg-white rounded-full border-4 border-fuchsia-500 shadow-lg flex items-center justify-center text-2xl"
            style={{ 
                left: `${note.lane * 25}%`, 
                top: `${note.y}px`,
                transform: 'translateX(12%)'
            }}
          >
            🎵
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-4 gap-4 mt-8 w-80">
        {[0, 1, 2, 3].map(i => (
          <button
            key={i}
            onPointerDown={() => handleHit(i)}
            className="h-16 bg-white/10 hover:bg-white/30 border-2 border-white/20 rounded-2xl text-white font-black text-xl active:scale-90 transition-transform"
          >
            {i + 1}
          </button>
        ))}
      </div>
      <p className="mt-4 text-white/50 text-xs">CLICK BUTTONS AS NOTES CROSS THE LINE!</p>
    </div>
  );
};

export default RhythmGame;
