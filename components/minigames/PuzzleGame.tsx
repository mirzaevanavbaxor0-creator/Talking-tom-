
import React, { useState, useEffect } from 'react';

const PuzzleGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  const isSolved = (arr: number[]) => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[arr.length - 1] === 0;
  };

  const shuffle = () => {
    let newTiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    // Simple shuffle by making random legal moves to ensure solvability
    for (let i = 0; i < 100; i++) {
        const emptyIdx = newTiles.indexOf(0);
        const neighbors = getNeighbors(emptyIdx);
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        [newTiles[emptyIdx], newTiles[randomNeighbor]] = [newTiles[randomNeighbor], newTiles[emptyIdx]];
    }
    setTiles(newTiles);
    setMoves(0);
    setSolved(false);
  };

  const getNeighbors = (idx: number) => {
    const neighbors = [];
    const r = Math.floor(idx / 3);
    const c = idx % 3;
    if (r > 0) neighbors.push(idx - 3);
    if (r < 2) neighbors.push(idx + 3);
    if (c > 0) neighbors.push(idx - 1);
    if (c < 2) neighbors.push(idx + 1);
    return neighbors;
  };

  useEffect(() => {
    shuffle();
  }, []);

  const moveTile = (idx: number) => {
    if (solved) return;
    const emptyIdx = tiles.indexOf(0);
    const neighbors = getNeighbors(idx);
    
    if (neighbors.includes(emptyIdx)) {
      const newTiles = [...tiles];
      [newTiles[idx], newTiles[emptyIdx]] = [newTiles[emptyIdx], newTiles[idx]];
      setTiles(newTiles);
      setMoves(m => m + 1);
      if (isSolved(newTiles)) setSolved(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 p-8 rounded-3xl border border-white/20 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-white bg-white/10 px-4 py-2 rounded-xl text-sm font-bold">← BACK</button>
          <div className="text-white text-center">
            <h2 className="text-xl font-black">TOM PUZZLE</h2>
            <p className="text-xs opacity-70">Moves: {moves}</p>
          </div>
          <button onClick={shuffle} className="text-white bg-emerald-500 px-4 py-2 rounded-xl text-sm font-bold">SHUFFLE</button>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-emerald-800/50 p-2 rounded-xl">
          {tiles.map((tile, idx) => (
            <div
              key={idx}
              onClick={() => moveTile(idx)}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl font-black cursor-pointer transition-all duration-200 ${
                tile === 0 
                ? 'bg-transparent' 
                : 'bg-white text-emerald-900 shadow-md hover:scale-105 active:scale-95'
              }`}
            >
              {tile !== 0 && (
                <div className="flex flex-col items-center">
                   <span>{tile}</span>
                   <span className="text-[10px] opacity-40">CAT</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {solved && (
          <div className="mt-8 text-center">
            <h3 className="text-3xl font-black text-emerald-400">GENIUS!</h3>
            <p className="text-white">Solved in {moves} moves.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PuzzleGame;
