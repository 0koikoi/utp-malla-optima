import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { parseUTPExcel } from '../adapters/utpExcelAdapter';
import { useAcademicStore } from '../store/useAcademicStore';

interface FileUploadProps {
  onSuccess?: () => void;
}

export const FileUpload = ({ onSuccess }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setCursos = useAcademicStore((state) => state.setCursos);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      setErrorMessage('Sube un archivo Excel válido (.xlsx o .xls).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cursosParsed = await parseUTPExcel(file);
      if (cursosParsed.length === 0) throw new Error('No se encontraron cursos válidos.');

      await setCursos(cursosParsed, file.name);
      setFileName(file.name);
      onSuccess?.();
    } catch (error) {
      console.error('Error al procesar el Excel:', error);
      setErrorMessage('No se pudo interpretar la malla. Revisa que sea el Excel de avance de plan de estudios.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-upload-wrap">
      <div
        className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void processFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void processFile(file);
          }}
          hidden
        />

        {isLoading ? (
          <>
            <Loader2 className="upload-spin" size={31} />
            <strong>Procesando plan de estudios…</strong>
            <span>Normalizando cursos, estados y prerrequisitos.</span>
          </>
        ) : fileName ? (
          <>
            <CheckCircle2 className="upload-success" size={31} />
            <strong>{fileName}</strong>
            <span>Malla cargada correctamente.</span>
          </>
        ) : (
          <>
            <span className="upload-icon"><UploadCloud size={24} /></span>
            <strong>Arrastra tu Excel o haz clic para seleccionarlo</strong>
            <span>Plan_de_Estudio.xlsx · formatos .xlsx / .xls</span>
            <small><FileSpreadsheet size={13} /> Lectura local: el archivo no se envía a un servidor</small>
          </>
        )}
      </div>

      {errorMessage && (
        <div className="file-upload-error">
          <AlertCircle size={15} /> {errorMessage}
        </div>
      )}
    </div>
  );
};
