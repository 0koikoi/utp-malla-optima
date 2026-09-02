import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <div id="app-topbar" className={styles.topbar}>
      <span className={styles.title}>UTP Malla Óptima</span>
      <span className={styles.badge}>Simulador</span>
      <span className={styles.sep} />
      <span className={styles.note}>Sede Ate · Tarifario 2026 · referencial</span>
    </div>
  );
}
