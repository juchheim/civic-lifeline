"use client";

import { useEffect } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export interface SeriesPoint { date: string; value: number }

export default function TimeSeriesChart({ points }: { points: SeriesPoint[] }) {
  const data = points.map((p) => ({ date: p.date, value: p.value }));

  // Fix Recharts measurement span positioning after render
  useEffect(() => {
    const fixMeasurementSpan = () => {
      const spans = document.querySelectorAll('[id^="recharts_measurement_span"], [id*="recharts_measurement"]');
      spans.forEach((span) => {
        const el = span as HTMLElement;
        const computedTop = window.getComputedStyle(el).top;
        if (computedTop.includes("-20000") || el.style.top.includes("-20000")) {
          el.style.position = "fixed";
          el.style.top = "0px";
          el.style.left = "-9999px";
          el.style.width = "1px";
          el.style.height = "1px";
          el.style.margin = "0";
          el.style.padding = "0";
          el.style.border = "none";
          el.style.overflow = "hidden";
          el.style.clip = "rect(0, 0, 0, 0)";
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
        }
      });
    };

    // Fix immediately and on any DOM changes
    fixMeasurementSpan();
    const observer = new MutationObserver(() => {
      requestAnimationFrame(fixMeasurementSpan);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'id'] });

    // Also run on intervals as a fallback
    const interval = setInterval(fixMeasurementSpan, 100);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full h-64 relative overflow-hidden" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.ceil(data.length / 8)} />
          <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
