import { Upload } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';
import { importAcademicBackup } from '../application/usecases/importAcademicBackup';
import { useState } from 'react';

export const BackupControls = () => {
  const { importarCursos, setTarifario } = useAcademicStore();
  const [error, setError] = useState('');

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
      <label className="nav-action secondary">
        <Upload size={14} /> Importar
        <input hidden type="file" accept="application/json" onChange={importar} />
      </label>
      {error && <span className="backup-error" role="alert">{error}</span>}
    </div>
  );
};
