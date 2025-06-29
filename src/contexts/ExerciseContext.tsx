import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getExercices, getActiveExercice, updateExercice } from '../services/database';
import { Exercice } from '../types/accounting';

interface ExerciseContextType {
  exercices: Exercice[];
  selectedExercice: string;
  activeExercice: Exercice | null;
  setSelectedExercice: (year: string) => void;
  refreshExercices: () => Promise<void>;
  setActiveExercice: (year: string) => Promise<void>;
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

interface ExerciseProviderProps {
  children: ReactNode;
}

export const ExerciseProvider: React.FC<ExerciseProviderProps> = ({ children }) => {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExerciceState] = useState<string>('');
  const [activeExercice, setActiveExerciceState] = useState<Exercice | null>(null);

  // Charger l'exercice sélectionné depuis localStorage
  useEffect(() => {
    const savedExercice = localStorage.getItem('selectedExercice');
    if (savedExercice) {
      setSelectedExerciceState(savedExercice);
    }
  }, []);

  // Sauvegarder l'exercice sélectionné dans localStorage
  const setSelectedExercice = (year: string) => {
    setSelectedExerciceState(year);
    localStorage.setItem('selectedExercice', year);
  };

  // Charger tous les exercices
  const refreshExercices = async () => {
    try {
      const [allExercices, currentActive] = await Promise.all([
        getExercices(),
        getActiveExercice()
      ]);
      
      const sortedExercices = allExercices.sort((a, b) => b.year.localeCompare(a.year));
      setExercices(sortedExercices);
      setActiveExerciceState(currentActive || null);
      
      // Si aucun exercice sélectionné, utiliser l'exercice actif ou le plus récent
      if (!selectedExercice) {
        const defaultExercice = currentActive?.year || sortedExercices[0]?.year || new Date().getFullYear().toString();
        setSelectedExercice(defaultExercice);
      }
    } catch (error) {
      console.error('Error loading exercices:', error);
    }
  };

  // Définir un exercice comme actif
  const setActiveExercice = async (year: string) => {
    try {
      // Désactiver tous les exercices
      for (const exercice of exercices) {
        if (exercice.isActive) {
          await updateExercice(exercice.id, { isActive: false });
        }
      }
      
      // Activer l'exercice sélectionné
      const targetExercice = exercices.find(ex => ex.year === year);
      if (targetExercice) {
        await updateExercice(targetExercice.id, { isActive: true });
      }
      
      // Rafraîchir les données
      await refreshExercices();
    } catch (error) {
      console.error('Error setting active exercice:', error);
    }
  };

  // Charger les exercices au montage
  useEffect(() => {
    refreshExercices();
  }, []);

  const value: ExerciseContextType = {
    exercices,
    selectedExercice,
    activeExercice,
    setSelectedExercice,
    refreshExercices,
    setActiveExercice
  };

  return (
    <ExerciseContext.Provider value={value}>
      {children}
    </ExerciseContext.Provider>
  );
};

export const useExercise = (): ExerciseContextType => {
  const context = useContext(ExerciseContext);
  if (!context) {
    throw new Error('useExercise must be used within an ExerciseProvider');
  }
  return context;
};