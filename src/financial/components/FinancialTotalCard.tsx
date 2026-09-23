export function FinancialTotalCard({ total }: { total: number }) {
  return (
    <div className="financial-total-card">
      <span>Total planificación</span>
      <strong>S/ {total.toFixed(2)}</strong>
    </div>
  );
}
