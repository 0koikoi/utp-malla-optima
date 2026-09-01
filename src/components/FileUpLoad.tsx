import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseUTPExcel } from '../adapters/utpExcelAdapter';
import { useAcademicStore } from '../store/useAcademicStore';

interface FileUploadProps {
  onSuccess?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onSuccess }) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const setCursos = useAcademicStore((state) => state.setCursos);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Por favor, sube un archivo Excel válido (.xlsx o .xls)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cursosParsed = await parseUTPExcel(file);
      
      if (cursosParsed.length === 0) {
        throw new Error('No se encontraron cursos válidos en el archivo.');
      }

      await setCursos(cursosParsed);
      setFileName(file.name);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error al procesar el Excel:', error);
      setErrorMessage('Ocurrió un error al procesar la malla curricular. Revisa el formato del archivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]' 
            : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-600'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center py-4 space-y-2">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-sm font-medium text-slate-300">Procesando plan de estudios...</p>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center py-2 space-y-2 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div className="text-sm font-medium text-slate-200">{fileName}</div>
            <p className="text-xs text-slate-400">
              Malla cargada correctamente. Haz clic o arrastra otro archivo para reemplazarla.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 space-y-3 text-center">
            <div className="p-3 bg-slate-800 rounded-full text-indigo-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Haz clic para subir o arrastra tu archivo Excel
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Formatos soportados: .xlsx o .xls del portal universitario
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Detección automática de códigos, créditos y prerrequisitos</span>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};