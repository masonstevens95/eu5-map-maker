interface StatProps {
  label: string;
  value: string;
}

export function Stat({ label, value }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
