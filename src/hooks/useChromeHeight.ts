import { useLayoutEffect, useRef } from 'react';

export function useChromeHeight(dependency: unknown) {
  const barrasRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const barras = barrasRef.current;
    if (!barras) return;
    const ajustarAltura = () => document.documentElement.style.setProperty(
      '--chrome-h', `${barras.getBoundingClientRect().height}px`
    );
    ajustarAltura();
    const observador = new ResizeObserver(ajustarAltura);
    observador.observe(barras);
    return () => {
      observador.disconnect();
      document.documentElement.style.removeProperty('--chrome-h');
    };
  }, [dependency]);
  return barrasRef;
}
