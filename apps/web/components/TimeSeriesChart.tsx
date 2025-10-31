"use client";

import { useEffect } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export interface SeriesPoint { date: string; value: number }

export default function TimeSeriesChart({ points }: { points: SeriesPoint[] }) {
  const data = points.map((p) => ({ date: p.date, value: p.value }));

  // Fix Recharts measurement span positioning after render (backup to inline script) - v2
  useEffect(() => {
    const fixMeasurementSpan = () => {
      const spans = document.querySelectorAll('[id^="recharts_measurement_span"], [id*="recharts_measurement"], [id*="measurement"][id*="recharts"]');
      spans.forEach((span) => {
        const el = span as HTMLElement;
        const computedTop = window.getComputedStyle(el).top;
        const inlineTop = el.style.top;
        if (computedTop.includes("-20000") || inlineTop.includes("-20000") || computedTop === "-20000px") {
          el.style.cssText = "position: fixed !important; top: 0px !important; left: -9999px !important; width: 1px !important; height: 1px !important; margin: 0 !important; padding: 0 !important; border: none !important; white-space: normal !important; font-size: 0 !important; letter-spacing: normal !important; line-height: 0 !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; visibility: hidden !important; pointer-events: none !important; z-index: -9999 !important;";
        }
      });
    };

    // Fix immediately
    fixMeasurementSpan();
    // Also after a short delay for any async rendering
    const timeout = setTimeout(fixMeasurementSpan, 10);
    const observer = new MutationObserver(() => {
      requestAnimationFrame(fixMeasurementSpan);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'id'] });

    // Fallback interval
    const interval = setInterval(fixMeasurementSpan, 50);
    
    return () => {
      clearTimeout(timeout);
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
