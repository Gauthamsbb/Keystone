'use client';

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { HeatmapDay } from '@/lib/actions/admin';

interface Props {
  data: HeatmapDay[];
  year: number;
}

const CELL_SIZE = 13;
const CELL_PAD = 2;
const STEP = CELL_SIZE + CELL_PAD;
const WEEK_LABEL_HEIGHT = 20; // top margin for month labels
const DAY_LABEL_WIDTH = 24;   // left margin for day labels

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Return ISO week number (Mon=0, Sun=6) and year for a given date
function isoWeekDay(d: Date): number {
  return (d.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
}

function startOfYear(year: number): Date {
  return new Date(`${year}-01-01T00:00:00.000Z`);
}

// Get the Monday on or before a given date
function weekStart(d: Date): Date {
  const day = isoWeekDay(d);
  const ms = d.getTime() - day * 86400000;
  return new Date(ms);
}

export function GlobalHeatmap({ data, year }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Build lookup: date string → count
    const countMap = new Map(data.map((d) => [d.date, d.count]));
    const maxCount = Math.max(...data.map((d) => d.count), 1);

    // Color scale: gray-800 for 0, violet gradient for >0
    const colorScale = d3
      .scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateRgb('#1f2937', '#7c3aed'));

    // Build list of all days in the year
    const jan1 = startOfYear(year);
    const dec31 = new Date(`${year}-12-31T00:00:00.000Z`);
    const firstWeekStart = weekStart(jan1);
    const lastWeekStart = weekStart(dec31);
    const totalWeeks = Math.round((lastWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 86400000)) + 1;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const svgWidth = DAY_LABEL_WIDTH + totalWeeks * STEP;
    const svgHeight = WEEK_LABEL_HEIGHT + 7 * STEP;

    svg.attr('width', svgWidth).attr('height', svgHeight);

    const g = svg
      .append('g')
      .attr('transform', `translate(${DAY_LABEL_WIDTH}, ${WEEK_LABEL_HEIGHT})`);

    // Draw day labels (Mon, Wed, Fri)
    DAY_LABELS.forEach((label, i) => {
      if (!label) return;
      svg
        .append('text')
        .attr('x', DAY_LABEL_WIDTH - 4)
        .attr('y', WEEK_LABEL_HEIGHT + i * STEP + CELL_SIZE - 2)
        .attr('text-anchor', 'end')
        .attr('font-size', 10)
        .attr('fill', '#6b7280')
        .text(label);
    });

    // Draw month labels
    let lastMonth = -1;
    for (let w = 0; w < totalWeeks; w++) {
      const weekDate = new Date(firstWeekStart.getTime() + w * 7 * 86400000);
      const month = weekDate.getUTCMonth();
      if (month !== lastMonth) {
        svg
          .append('text')
          .attr('x', DAY_LABEL_WIDTH + w * STEP)
          .attr('y', WEEK_LABEL_HEIGHT - 6)
          .attr('font-size', 10)
          .attr('fill', '#9ca3af')
          .text(MONTHS[month]);
        lastMonth = month;
      }
    }

    // Draw cells
    for (let w = 0; w < totalWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(firstWeekStart.getTime() + (w * 7 + d) * 86400000);
        if (cellDate.getUTCFullYear() !== year) continue;

        const dateStr = cellDate.toISOString().split('T')[0];
        const count = countMap.get(dateStr) ?? 0;
        const color = count === 0 ? '#1f2937' : colorScale(count);

        g.append('rect')
          .attr('x', w * STEP)
          .attr('y', d * STEP)
          .attr('width', CELL_SIZE)
          .attr('height', CELL_SIZE)
          .attr('rx', 2)
          .attr('fill', color)
          .attr('stroke', '#111827')
          .attr('stroke-width', 0.5)
          .style('cursor', count > 0 ? 'pointer' : 'default')
          .on('mouseenter', (event: MouseEvent) => {
            const rect = (event.target as SVGRectElement).getBoundingClientRect();
            const svgRect = svgRef.current!.getBoundingClientRect();
            setTooltip({
              x: rect.left - svgRect.left + CELL_SIZE / 2,
              y: rect.top - svgRect.top - 8,
              text: `${dateStr}: ${count} event${count !== 1 ? 's' : ''}`,
            });
          })
          .on('mouseleave', () => setTooltip(null));
      }
    }
  }, [data, year]);

  return (
    <div className="relative inline-block">
      <svg ref={svgRef} />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-800 border border-gray-600 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
