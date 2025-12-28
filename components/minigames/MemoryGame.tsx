
import React, { useState, useEffect } from 'react';

const EMOJIS = ['🐱', '🍗', '🥛', '🧶', '🐭', '🐟', '🎾', '🏠'];

const MemoryGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedIds([]);
    setMoves(0);
    setGameComplete(false);
  };

  const handleCardClick = (id: number) => {
    if (flippedIds.length === 2 || cards[id].flipped || cards[id].matched) return;

    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;
      if (cards[firstId].emoji === cards[secondId].emoji) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstId].matched = true;
          matchedCards[secondId].matched = true;
          setCards(matchedCards);
          setFlippedIds([]);
          if (matchedCards.every(c => c.matched)) setGameComplete(true);
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstId].flipped = false;
          resetCards[secondId].flipped = false;
          setCards(resetCards);
          setFlippedIds([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-indigo-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 p-8 rounded-3xl border border-white/20 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-white bg-white/10 px-4 py-2 rounded-xl text-sm font-bold">← BACK</button>
          <div className="text-white text-center">
            <h2 className="text-xl font-black">MEMORY MATCH</h2>
            <p className="text-xs opacity-70">Moves: {moves}</p>
          </div>
          <button onClick={initGame} className="text-white bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold">RESET</button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {cards.map(card => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`aspect-square rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all duration-300 transform ${
                card.flipped || card.matched 
                ? 'bg-white rotate-0' 
                : 'bg-indigo-600 rotate-180 hover:bg-indigo-500'
              } ${card.matched ? 'opacity-50 scale-95' : ''}`}
            >
              {(card.flipped || card.matched) ? card.emoji : '❓'}
            </div>
          ))}
        </div>

        {gameComplete && (
          <div className="mt-8 text-center animate-bounce">
            <h3 className="text-3xl font-black text-yellow-400">PAW-SOME!</h3>
            <p className="text-white">You matched them all in {moves} moves!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryGame;
