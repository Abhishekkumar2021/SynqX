import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '@/hooks/useTheme';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [id] = useState(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          // Update theme configuration before rendering
          mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
          });
          
          const { svg } = await mermaid.render(id, chart);
          setSvg(svg);
        } catch (error) {
          console.error('Mermaid render error:', error);
          ref.current.innerHTML = '<div class="text-destructive font-mono text-xs p-4 bg-destructive/10 rounded-xl border border-destructive/20">Mermaid Render Error</div>';
        }
      }
    };

    renderChart();
  }, [chart, id, theme]);

  return (
    <div 
      ref={ref} 
      className="flex justify-center my-8 p-6 rounded-2xl bg-muted/20 border border-border/40 overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
