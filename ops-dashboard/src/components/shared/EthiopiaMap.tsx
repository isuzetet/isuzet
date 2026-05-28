import React from 'react';
import { cn } from '@/lib/utils';

interface Node {
  id: string;
  name: string;
  amharic: string;
  x: number;
  y: number;
  volume: number;
}

interface Corridor {
  id: string;
  from: string;
  to: string;
  health: number;
  volume: number;
}

const nodes: Node[] = [
  { id: 'addis', name: 'Addis Ababa', amharic: 'አዲስ አበባ', x: 50, y: 50, volume: 100 },
  { id: 'hawassa', name: 'Hawassa', amharic: 'ሀዋሳ', x: 52, y: 75, volume: 60 },
  { id: 'jimma', name: 'Jimma', amharic: 'ጅማ', x: 35, y: 65, volume: 50 },
  { id: 'dire', name: 'Dire Dawa', amharic: 'ድሬዳዋ', x: 75, y: 45, volume: 70 },
  { id: 'gondar', name: 'Gondar', amharic: 'ጎንደር', x: 35, y: 25, volume: 45 },
  { id: 'mekelle', name: 'Mekelle', amharic: 'መቐለ', x: 55, y: 15, volume: 55 },
  { id: 'gambela', name: 'Gambela', amharic: 'ጋምቤላ', x: 15, y: 60, volume: 30 },
  { id: 'bahirdar', name: 'Bahir Dar', amharic: 'ባህር ዳር', x: 40, y: 35, volume: 65 },
  { id: 'adama', name: 'Adama', amharic: 'አዳማ', x: 58, y: 55, volume: 80 },
];

const corridors: Corridor[] = [
  { id: 'addis-dire', from: 'addis', to: 'dire', health: 85, volume: 12 },
  { id: 'addis-hawassa', from: 'addis', to: 'hawassa', health: 92, volume: 8 },
  { id: 'addis-bahirdar', from: 'addis', to: 'bahirdar', health: 65, volume: 10 },
  { id: 'bahirdar-gondar', from: 'bahirdar', to: 'gondar', health: 45, volume: 6 },
  { id: 'addis-adama', from: 'addis', to: 'adama', health: 98, volume: 15 },
  { id: 'adama-dire', from: 'adama', to: 'dire', health: 88, volume: 11 },
  { id: 'addis-jimma', from: 'addis', to: 'jimma', health: 72, volume: 7 },
  { id: 'bahirdar-mekelle', from: 'bahirdar', to: 'mekelle', health: 35, volume: 5 },
];

const EthiopiaMap = ({ onSelectCorridor, className }: { onSelectCorridor?: (id: string) => void, className?: string }) => {
  const getHealthColor = (health: number) => {
    if (health > 70) return '#1D9E75';
    if (health > 40) return '#BA7517';
    return '#A32D2D';
  };

  return (
    <div className={cn("relative bg-isuzet-surface rounded-lg border border-isuzet-border overflow-hidden aspect-[4/3]", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path 
          d="M20,20 L40,10 L60,10 L80,20 L90,40 L85,70 L70,90 L40,90 L10,70 L10,40 Z" 
          fill="#161B22" 
          stroke="#30363D" 
          strokeWidth="0.5"
        />
        
        {corridors.map(c => {
          const from = nodes.find(n => n.id === c.from)!;
          const to = nodes.find(n => n.id === c.to)!;
          return (
            <line
              key={c.id}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={getHealthColor(c.health)}
              strokeWidth={c.volume / 4}
              strokeLinecap="round"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onSelectCorridor?.(c.id)}
            />
          );
        })}

        {nodes.map(n => (
          <g key={n.id} className="cursor-pointer group">
            <circle
              cx={n.x} cy={n.y}
              r={n.volume / 40 + 1}
              fill="#0F6E56"
              stroke="#E6EDF3"
              strokeWidth="0.2"
            />
            <text
              x={n.x} y={n.y - 3}
              textAnchor="middle"
              fill="#E6EDF3"
              fontSize="2"
              className="font-bold pointer-events-none"
            >
              {n.name}
            </text>
            <text
              x={n.x} y={n.y + 4}
              textAnchor="middle"
              fill="#7D8590"
              fontSize="1.5"
              className="pointer-events-none"
            >
              {n.amharic}
            </text>
          </g>
        ))}
      </svg>
      
      <div className="absolute bottom-2 left-2 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-0.5 bg-brand-success" />
          <span className="text-[8px] text-isuzet-secondary uppercase">{"Healthy (>70)"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-0.5 bg-brand-accent" />
          <span className="text-[8px] text-isuzet-secondary uppercase">{"Degraded (40-70)"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-0.5 bg-brand-danger" />
          <span className="text-[8px] text-isuzet-secondary uppercase">{"Critical (<40)"}</span>
        </div>
      </div>
    </div>
  );
};

export default EthiopiaMap;