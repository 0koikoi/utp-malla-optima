import { Download, Upload } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';
import { downloadBlob } from '../services/backupService';
import { exportAcademicBackup } from '../application/usecases/exportAcademicBackup';
import { importAcademicBackup } from '../application/usecases/importAcademicBackup';
import { useState } from 'react';

export const BackupControls = () => {
  const { cursos, tarifario, importarCursos, setTarifario } = useAcademicStore();
  const [error, setError] = useState('');

  const exportar = () => {
    const blob = exportAcademicBackup(cursos, tarifario);
    downloadBlob(blob, 'avance_academico.json');
  };

  const importar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const data = await importAcademicBackup(file);
      await importarCursos(data.cursos);
      if (data.tarifario) await setTarifario(data.tarifario);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo importar el respaldo.');
    }
    event.target.value = '';
  };

  return (
    <div className="backup-controls">
      <button type="button" className="nav-action secondary" onClick={exportar} disabled={cursos.length === 0}>
        <Download size={14} /> Respaldo
      </button>
      <label className="nav-action secondary">
        <Upload size={14} /> Importar
        <input hidden type="file" accept="application/json" onChange={importar} />
      </label>
      {error && <span className="backup-error" role="alert">{error}</span>}
    </div>
  );
};
