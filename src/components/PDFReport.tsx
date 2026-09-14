import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Curso } from '../types/academic';

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
        Créditos planificados: {cursos.reduce((total, curso) => total + curso.creditos, 0)}
      </Text>
      <View>
        {cursos.map((curso) => (
          <Text key={curso.codigo} style={styles.row}>
            {curso.ciclo}° ciclo - {curso.nombre} ({curso.creditos} créditos)
          </Text>
        ))}
      </View>
    </Page>
  </Document>
);

export const PDFReport = ({ cursos }: { cursos: Curso[] }) => (
  <PDFDownloadLink
    document={<ReportDocument cursos={cursos} />}
    fileName="proyeccion_academica.pdf"
    className="nav-action secondary"
  >
    {({ loading }) => (loading ? 'Generando PDF...' : 'PDF')}
  </PDFDownloadLink>
);
