import React, { useMemo, useState } from 'react';
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
  const [hoverKdeX, setHoverKdeX] = useState<number | null>(null);

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

  const width = 560;
  const heightBox = 74;
  const heightKde = 92;
  const padding = 36;
  const effectiveWidth = width - padding * 2;

  const formatVal = (v: number) => {
    if (Math.abs(v) >= 10000) return Math.round(v).toLocaleString();
    if (Number.isInteger(v)) return v.toString();
    return (Math.round(v * 100) / 100).toString();
  };

  const scaleX = (val: number) => {
    const range = stats.max - stats.min || 1;
    return padding + ((val - stats.min) / range) * effectiveWidth;
  };

  // KDE Geometry
  const baselineKde = heightKde - 24;
  const kdePoints = stats.densityPoints.map((pt) => {
    const x = scaleX(pt.x);
    const yRatio = stats.maxDensity > 0 ? pt.y / stats.maxDensity : 0;
    const y = baselineKde - yRatio * (baselineKde - 14);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const kdePathD = `M ${scaleX(stats.min).toFixed(1)},${baselineKde.toFixed(1)} L ${kdePoints.join(
    ' L '
  )} L ${scaleX(stats.max).toFixed(1)},${baselineKde.toFixed(1)} Z`;

  // Calibrated ticks for KDE X-Axis (5 evenly spaced intervals)
  const kdeTicksCount = 5;
  const kdeTickStep = (stats.max - stats.min) / (kdeTicksCount - 1);
  const kdeTicks = Array.from({ length: kdeTicksCount }, (_, i) => stats.min + i * kdeTickStep);

  // 1-Sigma empirical boundaries
  const sigmaLower = Math.max(stats.min, stats.meanVal - stats.std);
  const sigmaUpper = Math.min(stats.max, stats.meanVal + stats.std);

  // Hover tracker for KDE
  const handleKdeMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    if (svgX >= padding && svgX <= width - padding) {
      const dataVal = stats.min + ((svgX - padding) / effectiveWidth) * (stats.max - stats.min);
      setHoverKdeX(dataVal);
    } else {
      setHoverKdeX(null);
    }
  };

  const boxCenterY = 24;
  const boxAxisY = 46;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Low-Graphic Minimalist Box & Whisker Plot with Calibrated X-Axis */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Box &amp; Whisker Plot (Five-Number Summary)
            </h5>
          </div>
          <div className="text-[10px] font-mono text-slate-700 dark:text-muted flex flex-wrap gap-2">
            <span>Min: {formatVal(stats.min)}</span>
            <span>Q1: {formatVal(stats.q1)}</span>
            <span className="text-cyan-800 dark:text-cyan-400 font-bold">Med: {formatVal(stats.median)}</span>
            <span>Q3: {formatVal(stats.q3)}</span>
            <span>Max: {formatVal(stats.max)}</span>
            <span className="text-slate-500">IQR: {formatVal(stats.iqr)}</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${heightBox}`} className="w-full h-18 overflow-visible select-none">
          {/* Whisker Center Line */}
          <line
            x1={scaleX(stats.lowerFence)}
            y1={boxCenterY}
            x2={scaleX(stats.upperFence)}
            y2={boxCenterY}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-600"
            strokeWidth="1.5"
            strokeDasharray="2,2"
          />

          {/* Lower Fence Whisker Bar */}
          <line
            x1={scaleX(stats.lowerFence)}
            y1={boxCenterY - 7}
            x2={scaleX(stats.lowerFence)}
            y2={boxCenterY + 7}
            stroke="currentColor"
            className="text-slate-500 dark:text-slate-400"
            strokeWidth="2"
          >
            <title>Lower Fence: {formatVal(stats.lowerFence)} (Q1 - 1.5×IQR)</title>
          </line>

          {/* Upper Fence Whisker Bar */}
          <line
            x1={scaleX(stats.upperFence)}
            y1={boxCenterY - 7}
            x2={scaleX(stats.upperFence)}
            y2={boxCenterY + 7}
            stroke="currentColor"
            className="text-slate-500 dark:text-slate-400"
            strokeWidth="2"
          >
            <title>Upper Fence: {formatVal(stats.upperFence)} (Q3 + 1.5×IQR)</title>
          </line>

          {/* IQR Box (Q1 to Q3) */}
          <rect
            x={scaleX(stats.q1)}
            y={boxCenterY - 13}
            width={Math.max(3, scaleX(stats.q3) - scaleX(stats.q1))}
            height={26}
            rx={4}
            className="fill-cyan-500/20 stroke-cyan-600 dark:stroke-cyan-400/80"
            strokeWidth="1.5"
          >
            <title>IQR Box: [{formatVal(stats.q1)} to {formatVal(stats.q3)}] (Spread = {formatVal(stats.iqr)})</title>
          </rect>

          {/* Median Line */}
          <line
            x1={scaleX(stats.median)}
            y1={boxCenterY - 13}
            x2={scaleX(stats.median)}
            y2={boxCenterY + 13}
            className="stroke-cyan-700 dark:stroke-cyan-300"
            strokeWidth="2.5"
          >
            <title>Median (50th Percentile): {formatVal(stats.median)}</title>
          </line>

          {/* Outliers */}
          {stats.outliers.map((outVal, idx) => (
            <circle
              key={idx}
              cx={scaleX(outVal)}
              cy={boxCenterY}
              r={3.5}
              className="fill-amber-500/80 stroke-amber-600 dark:stroke-amber-400 cursor-pointer"
              strokeWidth="1.2"
            >
              <title>
                Outlier: {formatVal(outVal)} (z = {((outVal - stats.meanVal) / stats.std).toFixed(2)}σ)
              </title>
            </circle>
          ))}

          {/* Calibrated X-Axis Line */}
          <line
            x1={padding}
            y1={boxAxisY}
            x2={width - padding}
            y2={boxAxisY}
            stroke="currentColor"
            className="text-slate-300 dark:text-border"
            strokeWidth="1"
          />

          {/* X-Axis Ticks & Values */}
          {/* Min */}
          <line x1={scaleX(stats.min)} y1={boxAxisY} x2={scaleX(stats.min)} y2={boxAxisY + 4} stroke="currentColor" className="text-slate-400" strokeWidth="1" />
          <text x={scaleX(stats.min)} y={boxAxisY + 14} textAnchor="start" className="fill-slate-600 dark:fill-slate-400 font-mono text-[9px]">
            {formatVal(stats.min)}
          </text>

          {/* Q1 */}
          <line x1={scaleX(stats.q1)} y1={boxAxisY} x2={scaleX(stats.q1)} y2={boxAxisY + 4} stroke="currentColor" className="text-slate-400" strokeWidth="1" />
          <text x={scaleX(stats.q1)} y={boxAxisY + 14} textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 font-mono text-[9px]">
            {formatVal(stats.q1)}
          </text>

          {/* Median */}
          <line x1={scaleX(stats.median)} y1={boxAxisY - 2} x2={scaleX(stats.median)} y2={boxAxisY + 5} stroke="currentColor" className="text-cyan-600 dark:text-cyan-400" strokeWidth="1.5" />
          <text x={scaleX(stats.median)} y={boxAxisY + 14} textAnchor="middle" className="fill-cyan-800 dark:fill-cyan-300 font-mono text-[9px] font-bold">
            {formatVal(stats.median)}
          </text>

          {/* Q3 */}
          <line x1={scaleX(stats.q3)} y1={boxAxisY} x2={scaleX(stats.q3)} y2={boxAxisY + 4} stroke="currentColor" className="text-slate-400" strokeWidth="1" />
          <text x={scaleX(stats.q3)} y={boxAxisY + 14} textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 font-mono text-[9px]">
            {formatVal(stats.q3)}
          </text>

          {/* Max */}
          <line x1={scaleX(stats.max)} y1={boxAxisY} x2={scaleX(stats.max)} y2={boxAxisY + 4} stroke="currentColor" className="text-slate-400" strokeWidth="1" />
          <text x={scaleX(stats.max)} y={boxAxisY + 14} textAnchor="end" className="fill-slate-600 dark:fill-slate-400 font-mono text-[9px]">
            {formatVal(stats.max)}
          </text>
        </svg>
      </div>

      {/* 2. Kernel Density Estimation (KDE) Continuous Density Curve with Calibrated Intervals */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Kernel Density Estimation (KDE Continuous Distribution)
            </h5>
          </div>
          <div className="text-[10px] font-mono text-slate-700 dark:text-muted flex flex-wrap gap-2">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Mean (μ): {formatVal(stats.meanVal)}</span>
            <span>Std Dev (σ): {formatVal(stats.std)}</span>
            <span className="text-slate-500">±1σ: [{formatVal(sigmaLower)}, {formatVal(sigmaUpper)}]</span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${heightKde}`}
          className="w-full h-22 overflow-visible select-none cursor-crosshair"
          onMouseMove={handleKdeMouseMove}
          onMouseLeave={() => setHoverKdeX(null)}
        >
          <defs>
            <linearGradient id="kdeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* 1-Sigma Empirical Zone Highlight */}
          <rect
            x={scaleX(sigmaLower)}
            y={14}
            width={Math.max(2, scaleX(sigmaUpper) - scaleX(sigmaLower))}
            height={baselineKde - 14}
            fill="#10b981"
            fillOpacity="0.06"
          />

          {/* Area Fill */}
          <path d={kdePathD} fill="url(#kdeGrad)" />

          {/* Curve Stroke */}
          <path
            d={`M ${kdePoints.join(' L ')}`}
            fill="none"
            className="stroke-emerald-600 dark:stroke-emerald-400"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Baseline X-Axis */}
          <line
            x1={padding}
            y1={baselineKde}
            x2={width - padding}
            y2={baselineKde}
            stroke="currentColor"
            className="text-slate-300 dark:text-border"
            strokeWidth="1"
          />

          {/* Calibrated X-Axis Ticks & Labels */}
          {kdeTicks.map((tVal, i) => {
            const x = scaleX(tVal);
            const anchor = i === 0 ? 'start' : i === kdeTicksCount - 1 ? 'end' : 'middle';
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={baselineKde}
                  x2={x}
                  y2={baselineKde + 4}
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={baselineKde + 14}
                  textAnchor={anchor}
                  className="fill-slate-600 dark:fill-slate-400 font-mono text-[9px]"
                >
                  {formatVal(tVal)}
                </text>
              </g>
            );
          })}

          {/* Mean Guideline (μ) */}
          <line
            x1={scaleX(stats.meanVal)}
            y1={10}
            x2={scaleX(stats.meanVal)}
            y2={baselineKde}
            stroke="#059669"
            strokeWidth="1.5"
            strokeDasharray="3,2"
          />
          <text
            x={scaleX(stats.meanVal)}
            y={8}
            textAnchor="middle"
            className="fill-emerald-700 dark:fill-emerald-300 font-mono text-[8px] font-bold"
          >
            μ
          </text>

          {/* Median Guideline (Med) */}
          <line
            x1={scaleX(stats.median)}
            y1={16}
            x2={scaleX(stats.median)}
            y2={baselineKde}
            stroke="#0284c7"
            strokeWidth="1.2"
            strokeDasharray="2,2"
          />
          <text
            x={scaleX(stats.median)}
            y={14}
            textAnchor="middle"
            className="fill-sky-700 dark:fill-sky-300 font-mono text-[8px] font-bold"
          >
            Med
          </text>

          {/* Interactive Hover Indicator */}
          {hoverKdeX !== null && (
            <g>
              <line
                x1={scaleX(hoverKdeX)}
                y1={6}
                x2={scaleX(hoverKdeX)}
                y2={baselineKde}
                stroke="currentColor"
                className="text-slate-700 dark:text-slate-300"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                cx={scaleX(hoverKdeX)}
                cy={baselineKde}
                r={3}
                className="fill-primary"
              />
            </g>
          )}
        </svg>

        {hoverKdeX !== null && (
          <div className="mt-1 flex items-center justify-end text-[10px] font-mono text-cyan-800 dark:text-cyan-400">
            <span>Cursor Probe: Value = {formatVal(hoverKdeX)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
