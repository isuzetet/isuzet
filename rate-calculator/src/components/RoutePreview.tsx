import { ZONES, getDistance } from '../constants/data';
import { Language } from '../types/calculator';
import { ArrowRight } from 'lucide-react';

interface Props {
  origin: string;
  dest: string;
  lang: Language;
}

export const RoutePreview = ({ origin, dest, lang }: Props) => {
  const originZone = ZONES.find(z => z.id === origin);
  const destZone = ZONES.find(z => z.id === dest);
  const distance = origin && dest ? getDistance(origin, dest) : null;

  return (
    <div className="bg-[#F6F8FA] border border-[#D0D7DE] rounded-lg p-3 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className={`font-semibold truncate ${origin ? 'text-[#1C2329]' : 'text-gray-400'}`}>
          {origin ? originZone?.[lang] : (lang === 'en' ? 'Origin' : 'መነሻ')}
        </span>
        <div className="flex items-center gap-1">
          <div className="h-[1px] w-8 border-t border-dashed border-gray-400" />
          <ArrowRight size={14} className="text-gray-400" />
          <div className="h-[1px] w-8 border-t border-dashed border-gray-400" />
        </div>
        <span className={`font-semibold truncate ${dest ? 'text-[#1C2329]' : 'text-gray-400'}`}>
          {dest ? destZone?.[lang] : (lang === 'en' ? 'Destination' : 'መድረሻ')}
        </span>
      </div>
      {distance && (
        <div className="text-sm font-bold text-[#0F6E56] whitespace-nowrap ml-4">
          {distance} km
        </div>
      )}
    </div>
  );
};