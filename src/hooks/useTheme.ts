import { useLayoutEffect, useState } from 'react';
import { STORAGE_KEYS } from '../config/storageKeys';

export function useTheme() {
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, tema);
    } catch {
      // La preferencia sigue funcionando durante la sesión.
    }
  }, [tema]);

  return { tema, cambiarTema: () => setTema((actual) => actual === 'light' ? 'dark' : 'light') };
}
