// DropZone — zona receptora de drag & drop con @dnd-kit
import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DropZoneProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function DropZone({ id, className = '', style, children }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  const combinedClass = [
    className,
    isOver ? 'dropzone-over' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      id={id}
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
