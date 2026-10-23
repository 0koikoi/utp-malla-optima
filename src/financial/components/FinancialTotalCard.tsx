export function FinancialTotalCard({ total }: { total: number }) {
  return (
    <div className="financial-total-card">
      <span>Total planificación</span>
      <strong>S/ {(Number(total) || 0).toFixed(2)}</strong>
    </div>
  );
}
