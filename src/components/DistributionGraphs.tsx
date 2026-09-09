import React, { useMemo } from 'react';
import * as ss from 'simple-statistics';

interface DistributionGraphsProps {
  values: number[];
  metricName: string;
  className?: string;
}

export const DistributionGraphs: React.FC<DistributionGraphsProps> = ({
  values,
  metricName,
  className = '',
}) => {
  const stats = useMemo(() => {
    if (values.length < 2) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const q1 = ss.quantile(sorted, 0.25);
    const median = ss.median(sorted);
    const q3 = ss.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerFence = Math.max(min, q1 - 1.5 * iqr);
    const upperFence = Math.min(max, q3 + 1.5 * iqr);
    const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

    // Kernel Density Estimation (KDE with Gaussian Kernel)
    const n = sorted.length;
    const meanVal = ss.mean(sorted);
    const std = ss.standardDeviation(sorted) || 1;
    // Silverman's rule of thumb for bandwidth
    const h = 1.06 * std * Math.pow(n, -0.2);

    const steps = 60;
    const range = max - min || 1;
    const stepSize = range / steps;
    const densityPoints: { x: number; y: number }[] = [];
    let maxDensity = 0;

    for (let i = 0; i <= steps; i++) {
      const x = min + i * stepSize;
      let sumKernel = 0;
      for (let j = 0; j < n; j++) {
        const u = (x - sorted[j]) / h;
        // Standard normal kernel (1 / sqrt(2pi)) * exp(-0.5 * u^2)
        sumKernel += 0.3989422804 * Math.exp(-0.5 * u * u);
      }
      const density = sumKernel / (n * h);
      if (density > maxDensity) maxDensity = density;
      densityPoints.push({ x, y: density });
    }

    return {
      min,
      max,
      q1,
      median,
      q3,
      iqr,
      lowerFence,
      upperFence,
      outliers,
      meanVal,
      std,
      densityPoints,
      maxDensity,
    };
  }, [values]);

  if (!stats) return null;

  const width = 500;
  const heightBox = 54;
  const heightKde = 70;
  const padding = 24;
  const effectiveWidth = width - padding * 2;

  const scaleX = (val: number) => {
    const range = stats.max - stats.min || 1;
    return padding + ((val - stats.min) / range) * effectiveWidth;
  };

  // Build KDE SVG Path
  const kdePoints = stats.densityPoints.map((pt) => {
    const x = scaleX(pt.x);
    const yRatio = stats.maxDensity > 0 ? pt.y / stats.maxDensity : 0;
    const y = heightKde - padding / 2 - yRatio * (heightKde - padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const kdePathD = `M ${scaleX(stats.min).toFixed(1)},${(heightKde - padding / 2).toFixed(1)} L ${kdePoints.join(' L ')} L ${scaleX(stats.max).toFixed(1)},${(heightKde - padding / 2).toFixed(1)} Z`;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Low-Graphic Minimalist Box & Whisker Plot */}
      <div className="p-3.5 rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Box &amp; Whisker Plot (Five-Number Summary)
            </h5>
          </div>
          <div className="text-[10px] font-mono text-muted flex gap-2">
            <span>Q1: {stats.q1.toFixed(2)}</span>
            <span className="text-cyan-400 font-bold">Med: {stats.median.toFixed(2)}</span>
            <span>Q3: {stats.q3.toFixed(2)}</span>
            <span>IQR: {stats.iqr.toFixed(2)}</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${heightBox}`} className="w-full h-14 overflow-visible select-none">
          {/* Whisker Center Line */}
          <line
            x1={scaleX(stats.lowerFence)}
            y1={heightBox / 2}
            x2={scaleX(stats.upperFence)}
            y2={heightBox / 2}
            stroke="currentColor"
            className="text-slate-500"
            strokeWidth="1.5"
            strokeDasharray="2,2"
          />

          {/* Lower Fence Whisker Bar */}
          <line
            x1={scaleX(stats.lowerFence)}
            y1={heightBox / 2 - 8}
            x2={scaleX(stats.lowerFence)}
            y2={heightBox / 2 + 8}
            stroke="currentColor"
            className="text-slate-400"
            strokeWidth="2"
          />

          {/* Upper Fence Whisker Bar */}
          <line
            x1={scaleX(stats.upperFence)}
            y1={heightBox / 2 - 8}
            x2={scaleX(stats.upperFence)}
            y2={heightBox / 2 + 8}
            stroke="currentColor"
            className="text-slate-400"
            strokeWidth="2"
          />

          {/* IQR Box (Q1 to Q3) */}
          <rect
            x={scaleX(stats.q1)}
            y={heightBox / 2 - 14}
            width={Math.max(2, scaleX(stats.q3) - scaleX(stats.q1))}
            height={28}
            rx={4}
            className="fill-cyan-500/20 stroke-cyan-500/60"
            strokeWidth="1.5"
          />

          {/* Median Line */}
          <line
            x1={scaleX(stats.median)}
            y1={heightBox / 2 - 14}
            x2={scaleX(stats.median)}
            y2={heightBox / 2 + 14}
            className="stroke-cyan-300"
            strokeWidth="2.5"
          />

          {/* Outliers */}
          {stats.outliers.map((outVal, idx) => (
            <circle
              key={idx}
              cx={scaleX(outVal)}
              cy={heightBox / 2}
              r={3}
              className="fill-amber-400/80 stroke-amber-500"
              strokeWidth="1"
            >
              <title>Outlier: {outVal}</title>
            </circle>
          ))}

          {/* Scale Labels */}
          <text x={scaleX(stats.min)} y={heightBox - 2} textAnchor="start" className="fill-slate-500 font-mono text-[9px]">
            Min: {stats.min.toFixed(1)}
          </text>
          <text x={scaleX(stats.max)} y={heightBox - 2} textAnchor="end" className="fill-slate-500 font-mono text-[9px]">
            Max: {stats.max.toFixed(1)}
          </text>
        </svg>
      </div>

      {/* 2. Kernel Density Estimation (KDE) Continuous Density Curve */}
      <div className="p-3.5 rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Kernel Density Estimation (KDE Continuous Curve)
            </h5>
          </div>
          <div className="text-[10px] font-mono text-muted">
            Gaussian Kernel • Mean: {stats.meanVal.toFixed(2)} • Std: {stats.std.toFixed(2)}
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${heightKde}`} className="w-full h-16 overflow-visible select-none">
          <defs>
            <linearGradient id="kdeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={kdePathD} fill="url(#kdeGrad)" />

          {/* Curve Stroke */}
          <path
            d={`M ${kdePoints.join(' L ')}`}
            fill="none"
            className="stroke-emerald-400"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Baseline */}
          <line
            x1={padding}
            y1={heightKde - padding / 2}
            x2={width - padding}
            y2={heightKde - padding / 2}
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />

          {/* Mean Marker */}
          <line
            x1={scaleX(stats.meanVal)}
            y1={padding / 2}
            x2={scaleX(stats.meanVal)}
            y2={heightKde - padding / 2}
            stroke="currentColor"
            className="text-emerald-300"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
          <text
            x={scaleX(stats.meanVal)}
            y={padding / 2 - 2}
            textAnchor="middle"
            className="fill-emerald-300 font-mono text-[8px]"
          >
            μ
          </text>
        </svg>
      </div>
    </div>
  );
};
