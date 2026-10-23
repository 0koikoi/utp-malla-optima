import { formatCredits } from '../utils/formatCredits';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Curso } from '../types/academic';
import { obtenerPeriodoCurso } from '../domain/rules/academicPeriodRules';
import { FileText } from 'lucide-react';
import { useMemo } from 'react';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10 },
  title: { fontSize: 16, marginBottom: 12 },
  row: { marginBottom: 4 }
});

const ReportDocument = ({ cursos }: { cursos: Curso[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Academic Planner - Proyección académica</Text>
      <Text>Total cursos: {cursos.length}</Text>
      <Text>
        Créditos planificados: {formatCredits(cursos.reduce((total, curso) => total + curso.creditos, 0))}
      </Text>
      <View>
        {cursos.map((curso) => (
          <Text key={curso.codigo} style={styles.row}>
            {obtenerPeriodoCurso(curso).etiqueta} - {curso.nombre} ({formatCredits(curso.creditos)} créditos)
          </Text>
        ))}
      </View>
    </Page>
  </Document>
);

export const PDFReport = ({ cursos, className = 'nav-action secondary', onDownload }: {
  cursos: Curso[];
  className?: string;
  onDownload?: () => void;
}) => {
  const documento = useMemo(() => <ReportDocument cursos={cursos} />, [cursos]);
  return (
    <PDFDownloadLink
      document={documento}
      fileName="proyeccion_academica.pdf"
      className={className}
      onClick={(event) => {
        if (!event.currentTarget.getAttribute('href')) {
          event.preventDefault();
          return;
        }
        onDownload?.();
      }}
    >
      {({ loading, error }) => <><FileText size={17} aria-hidden="true" /><span>{error ? 'PDF no disponible' : loading ? 'Generando PDF…' : 'PDF'}</span></>}
    </PDFDownloadLink>
  );
};
