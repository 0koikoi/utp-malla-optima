import { Download, Upload } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';
import { downloadBlob } from '../services/backupService';

export const BackupControls = () => {
  const { cursos, importarCursos } = useAcademicStore();

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ cursos }, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'avance_academico.json');
  };

  const importar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data.cursos)) await importarCursos(data.cursos);
    event.target.value = '';
  };

  return (
    <div className="backup-controls">
      <button type="button" className="nav-action secondary" onClick={exportar}>
        <Download size={14} /> Respaldo
      </button>
      <label className="nav-action secondary">
        <Upload size={14} /> Importar
        <input hidden type="file" accept="application/json" onChange={importar} />
      </label>
    </div>
  );
};
