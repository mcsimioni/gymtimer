import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Minus, Trash2, Dumbbell, Volume2, VolumeX } from 'lucide-react';

interface WorkoutSet {
  id: number;
  exerciseTime: number;
  restTime: number;
}

const STORAGE_KEY = 'gymtimer-workout-sets';
const SOUND_MUTED_KEY = 'gymtimer-sound-muted';
const COUNTDOWN_TIME = 3;

const DEFAULT_WORKOUT_SETS: WorkoutSet[] = [
  { id: 1, exerciseTime: 30, restTime: 30 },
  { id: 2, exerciseTime: 30, restTime: 30 },
  { id: 3, exerciseTime: 30, restTime: 30 },
  { id: 4, exerciseTime: 30, restTime: 30 },
];

function App() {
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>(() => {
    const savedSets = localStorage.getItem(STORAGE_KEY);
    return savedSets ? JSON.parse(savedSets) : DEFAULT_WORKOUT_SETS;
  });
  const [repetitions, setRepetitions] = useState(1);
  const [currentRepetition, setCurrentRepetition] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdownTime, setCountdownTime] = useState(COUNTDOWN_TIME);
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuted = localStorage.getItem(SOUND_MUTED_KEY);
    return savedMuted ? JSON.parse(savedMuted) : false;
  });
  const transitionAudioRef = useRef<HTMLAudioElement | null>(null);
  const completionAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const finalBeepAudioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();

  useEffect(() => {
    transitionAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    completionAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3');
    startAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    countdownAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    finalBeepAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3');

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workoutSets));
  }, [workoutSets]);

  useEffect(() => {
    localStorage.setItem(SOUND_MUTED_KEY, JSON.stringify(isMuted));
  }, [isMuted]);

  useEffect(() => {
    if (isStarting) {
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdownTime((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            playSound(finalBeepAudioRef.current);
            setCountdownTime(0);
            setTimeout(() => {
              startWorkoutAfterCountdown();
            }, 1500);
            return 0;
          }
          playSound(countdownAudioRef.current);
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(countdownIntervalRef.current);
      };
    }
  }, [isStarting]);

  useEffect(() => {
    if (isRunning && workoutSets.length > 0 && currentSetIndex < workoutSets.length && !isTransitioning && !isStarting) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handlePeriodEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => {
        clearInterval(intervalRef.current);
      };
    }
  }, [isRunning, currentSetIndex, isResting, workoutSets.length, isTransitioning, isStarting]);

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!isMuted && audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  const handlePeriodEnd = () => {
    clearInterval(intervalRef.current);
    playSound(transitionAudioRef.current);
    setIsTransitioning(true);

    setTimeout(() => {
      if (isResting) {
        if (currentSetIndex < workoutSets.length - 1) {
          setCurrentSetIndex(prev => prev + 1);
          setIsResting(false);
          setTimeLeft(workoutSets[currentSetIndex + 1].exerciseTime);
        } else {
          if (currentRepetition < repetitions) {
            setCurrentRepetition(prev => prev + 1);
            setCurrentSetIndex(0);
            setIsResting(false);
            setTimeLeft(workoutSets[0].exerciseTime);
          } else {
            setIsRunning(false);
            setCurrentSetIndex(0);
            setIsResting(false);
            setWorkoutCompleted(true);
            playSound(completionAudioRef.current);
            setTimeLeft(0);
          }
        }
      } else {
        setIsResting(true);
        setTimeLeft(workoutSets[currentSetIndex].restTime);
      }
      setIsTransitioning(false);
    }, 1000);
  };

  const addWorkoutSet = () => {
    if (workoutSets.length < 10) {
      setWorkoutSets(prev => [...prev, {
        id: Date.now(),
        exerciseTime: 30,
        restTime: 30
      }]);
    }
  };

  const removeWorkoutSet = (id: number) => {
    setWorkoutSets(prev => prev.filter(set => set.id !== id));
    if (isRunning) {
      setIsRunning(false);
      setCurrentSetIndex(0);
      setIsResting(false);
      setTimeLeft(0);
      clearInterval(intervalRef.current);
    }
  };

  const updateWorkoutSet = (id: number, field: 'exerciseTime' | 'restTime', value: number) => {
    const validValue = Math.max(1, value);
    setWorkoutSets(prev => prev.map(set => 
      set.id === id ? { ...set, [field]: validValue } : set
    ));
  };

  const startWorkoutAfterCountdown = () => {
    setIsRunning(true);
    setCurrentSetIndex(0);
    setCurrentRepetition(1);
    setIsResting(false);
    setWorkoutCompleted(false);
    setIsTransitioning(false);
    setTimeLeft(workoutSets[0].exerciseTime);
    setIsStarting(false);
  };

  const startWorkout = () => {
    if (workoutSets.length > 0) {
      setWorkoutCompleted(false);
      setIsStarting(true);
      setCountdownTime(COUNTDOWN_TIME);
      playSound(startAudioRef.current);
    }
  };

  const pauseWorkout = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  };

  const getTimerColor = () => {
    if (isStarting) return 'text-green-400';
    if (isTransitioning) return 'text-yellow-400';
    if (isResting) return 'text-blue-400';
    return 'text-red-400';
  };

  const incrementRepetitions = () => {
    setRepetitions(prev => Math.min(prev + 1, 10));
  };

  const decrementRepetitions = () => {
    setRepetitions(prev => Math.max(prev - 1, 1));
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3 text-red-500" />
            <h1 className="text-2xl sm:text-4xl font-bold">GymTimer Pro</h1>
          </div>
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg transition-colors ${
              isMuted ? 'bg-gray-700 text-gray-400' : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            title={isMuted ? 'Ativar sons' : 'Desativar sons'}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 sm:p-8 mb-8">
          {workoutCompleted ? (
            <div className="text-center">
              <div className="text-4xl font-bold text-green-500 mb-4">
                🎉 Parabéns! 🎉
              </div>
              <div className="text-xl text-gray-300 mb-6">
                Você completou todas as séries do seu treino!
              </div>
              <button
                onClick={startWorkout}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto"
              >
                <Play className="w-5 h-5 mr-2" />
                Recomeçar Treino
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className={`text-6xl font-bold mb-4 transition-colors duration-300 ${getTimerColor()}`}>
                  {isStarting ? (
                    countdownTime
                  ) : (
                    `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                  )}
                </div>
                <div className={`text-xl ${getTimerColor()} transition-colors duration-300`}>
                  {isStarting ? (
                    <span className="animate-pulse">Prepare-se...</span>
                  ) : isRunning ? (
                    isTransitioning ? (
                      <span className="animate-pulse">Preparando {isResting ? 'próxima série' : 'descanso'}...</span>
                    ) : (
                      isResting ? 'Descansando' : 'Exercitando'
                    )
                  ) : (
                    'Pronto para começar'
                  )}
                </div>
                {workoutSets.length > 0 && (
                  <div className="mt-4">
                    Série {currentSetIndex + 1} de {workoutSets.length} • 
                    Repetição {currentRepetition} de {repetitions}
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                {!isRunning && !isStarting ? (
                  <button
                    onClick={startWorkout}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Iniciar
                  </button>
                ) : !isStarting && (
                  <button
                    onClick={pauseWorkout}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Pausar
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Séries</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col items-start">
                <label className="text-xs sm:text-sm text-gray-400 mb-1">Repetições</label>
                <div className="flex items-center bg-gray-700 rounded-lg">
                  <button
                    onClick={decrementRepetitions}
                    disabled={repetitions <= 1}
                    className="p-2 text-white hover:bg-gray-600 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="px-4 py-2 font-semibold">
                    {repetitions}x
                  </div>
                  <button
                    onClick={incrementRepetitions}
                    disabled={repetitions >= 10}
                    className="p-2 text-white hover:bg-gray-600 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <button
                onClick={addWorkoutSet}
                disabled={workoutSets.length >= 10}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-3 py-2 text-sm sm:text-base rounded-lg flex items-center"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Nova Série
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {workoutSets.map((set, index) => (
              <div key={set.id} className="bg-gray-700 p-4 rounded-lg flex items-center gap-4">
                <span className="text-lg font-bold min-w-[30px]">#{index + 1}</span>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm mb-1">Exercício (seg)</label>
                    <input
                      type="number"
                      value={set.exerciseTime}
                      onChange={(e) => updateWorkoutSet(set.id, 'exerciseTime', parseInt(e.target.value))}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm mb-1">Descanso (seg)</label>
                    <input
                      type="number"
                      value={set.restTime}
                      onChange={(e) => updateWorkoutSet(set.id, 'restTime', parseInt(e.target.value))}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded"
                      min="1"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeWorkoutSet(set.id)}
                  className="text-red-400 hover:text-red-500 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            {workoutSets.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Adicione séries de treino para começar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;