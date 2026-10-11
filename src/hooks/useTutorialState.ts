import { useState } from 'react';
import { STORAGE_KEYS } from '../config/storageKeys';

export function useTutorialState() {
  const [tutorialCompletado, setTutorialCompletado] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.tutorialCompleted) === '1';
    } catch {
      return false;
    }
  });

  const finalizarTutorial = () => {
    setTutorialCompletado(true);
    try {
      window.localStorage.setItem(STORAGE_KEYS.tutorialCompleted, '1');
    } catch {
      // La configuración se abre igualmente si no se puede guardar.
    }
  };

  return { tutorialCompletado, finalizarTutorial };
}
