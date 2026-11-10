import React, { useState } from 'react';
import { X, Trophy, RefreshCw, HelpCircle, Gamepad2 } from 'lucide-react';

interface TableGamesModalProps {
  onClose: () => void;
}

export const TableGamesModal: React.FC<TableGamesModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'tictactoe' | 'quiz'>('tictactoe');

  // Tic-Tac-Toe State
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.every((square) => square !== null) ? 'Tie' : null;
  };

  const winner = calculateWinner(board);

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;
    const nextBoard = [...board];
    nextBoard[index] = isXNext ? 'X' : 'O';
    setBoard(nextBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  // Food Quiz State
  const quizQuestions = [
    {
      q: 'Which aromatic spice gives Biryani its signature royal golden tint?',
      options: ['Saffron (Kesar)', 'Cumin', 'Nutmeg', 'Cardamom'],
      correct: 0,
    },
    {
      q: 'What is the main base ingredient in authentic Dal Makhani?',
      options: ['Yellow Moong Dal', 'Whole Black Urad & Rajma', 'Chana Dal', 'Toor Dal'],
      correct: 1,
    },
    {
      q: 'Which clay oven is traditionally used to bake Indian Naan and Tandoori Tikka?',
      options: ['Sigri', 'Tandoor', 'Bhatti', 'Karahi'],
      correct: 1,
    },
  ];
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswerResult, setShowAnswerResult] = useState(false);

  const handleOptionSelect = (idx: number) => {
    if (showAnswerResult) return;
    setSelectedAnswer(idx);
    setShowAnswerResult(true);
    if (idx === quizQuestions[quizIndex].correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuiz = () => {
    setSelectedAnswer(null);
    setShowAnswerResult(false);
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((i) => i + 1);
    } else {
      setQuizIndex(0);
      setScore(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Table Games & Fun</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-white">
          <button
            onClick={() => setActiveTab('tictactoe')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'tictactoe'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tic-Tac-Toe
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'quiz'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Gourmet Quiz
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'tictactoe' ? (
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-slate-600 mb-4">
                {winner ? (
                  winner === 'Tie' ? (
                    <span className="text-amber-600 font-bold">Game Drawn! Play again?</span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" /> Player {winner} Wins!
                    </span>
                  )
                ) : (
                  <span>
                    Current Turn: <strong className="text-slate-900">{isXNext ? 'X' : 'O'}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 w-56 h-56 mb-4">
                {board.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    className="w-full h-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-2xl flex items-center justify-center transition-colors text-slate-800 active:scale-95"
                  >
                    <span className={cell === 'X' ? 'text-emerald-600' : 'text-blue-600'}>{cell}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={resetGame}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Match
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span>Question {quizIndex + 1} of {quizQuestions.length}</span>
                <span className="font-semibold text-emerald-600">Score: {score}</span>
              </div>

              <h4 className="text-xs font-semibold text-slate-900 mb-4 min-h-[40px]">
                {quizQuestions[quizIndex].q}
              </h4>

              <div className="space-y-2 mb-4">
                {quizQuestions[quizIndex].options.map((opt, i) => {
                  let btnColor = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700';
                  if (showAnswerResult) {
                    if (i === quizQuestions[quizIndex].correct) {
                      btnColor = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold';
                    } else if (i === selectedAnswer) {
                      btnColor = 'bg-rose-50 border-rose-500 text-rose-800';
                    }
                  }
                  return (
                    <button
                      key={i}
                      disabled={showAnswerResult}
                      onClick={() => handleOptionSelect(i)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${btnColor}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {showAnswerResult && (
                <button
                  onClick={handleNextQuiz}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {quizIndex < quizQuestions.length - 1 ? 'Next Question' : 'Play Again'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Enjoy your dining experience while our chefs craft your meal!
          </p>
        </div>
      </div>
    </div>
  );
};
