// DropZone — zona receptora de drag & drop con @dnd-kit
// El prop `id` es el identificador que usa dnd-kit para el droppable.
// El prop `htmlId` es el id HTML del elemento (para selectores CSS).
import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DropZoneProps {
  id: string;
  htmlId?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children: ReactNode;
}

export function DropZone({ id, htmlId, className = '', style, disabled = false, children }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled });

  const combinedClass = [className, isOver ? 'dropzone-over' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      id={htmlId ?? id}
      className={combinedClass}
      style={{
        ...style,
        outline: isOver ? '2px dashed #ef233c' : undefined,
        outlineOffset: isOver ? '2px' : undefined,
      }}
    >
      {children}
    </div>
  );
}
