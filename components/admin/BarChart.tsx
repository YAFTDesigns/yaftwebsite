import styles from './BarChart.module.css';

export type BarChartItem = { label: string; value: number };

export default function BarChart({ items, color = 'var(--blueprint)' }: { items: BarChartItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className={styles.chart}>
      {items.map((item) => (
        <div className={styles.row} key={item.label}>
          <span className={styles.label}>{item.label}</span>
          <div className={styles.track}>
            <div
              className={styles.bar}
              style={{ width: `${(item.value / max) * 100}%`, background: color }}
            />
          </div>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
