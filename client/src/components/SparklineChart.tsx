import React from 'react';

interface SparklineChartProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color,
  width = 120,
  height = 36,
}) => {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-500 font-mono w-[120px] h-[36px]">
        No trend data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = color || (data[data.length - 1] >= data[0] ? '#10b981' : '#ef4444');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
