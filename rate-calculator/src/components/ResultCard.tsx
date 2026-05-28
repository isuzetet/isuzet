import { EstimateResponse, Language, CalculatorState } from '../types/calculator';
import { ZONES, CARGO_TYPES } from '../constants/data';
import { CheckCircle2, AlertTriangle, Download, Share2 } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  estimate: EstimateResponse;
  state: CalculatorState;
  lang: Language;
}

export const ResultCard = ({ estimate, state, lang }: Props) => {
  const originZone = ZONES.find(z => z.id === state.originZone);
  const destZone = ZONES.find(z => z.id === state.destZone);
  const cargo = CARGO_TYPES.find(c => c.id === state.cargoType);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val);
  };

  const isRainy = () => {
    if (!state.pickupDate) return false;
    const month = new Date(state.pickupDate).getMonth();
    return month >= 5 && month <= 8; // June to Sept
  };

  return (
    <div className="bg-white border border-[#D0D7DE] rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-6 border-b border-[#D0D7DE] bg-[#F6F8FA]">
        <h2 className="text-lg font-bold text-[#1C2329] mb-1">
          {lang === 'en' ? 'Freight Estimate' : 'የጭነት ዋጋ ግምት'}
        </h2>
        <div className="flex items-center gap-2 text-[#0F6E56] font-semibold">
          <span>{originZone?.[lang]}</span>
          <ArrowRight size={16} />
          <span>{destZone?.[lang]}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[#57606A] mb-1">{lang === 'en' ? 'Distance' : 'ርቀት'}</p>
            <p className="font-medium">{estimate.distanceKm} km</p>
          </div>
          <div>
            <p className="text-[#57606A] mb-1">{lang === 'en' ? 'Est. Transit' : 'የመጓጓዣ ጊዜ'}</p>
            <p className="font-medium">{estimate.transitHours} {lang === 'en' ? 'hours' : 'ሰዓታት'}</p>
          </div>
          <div>
            <p className="text-[#57606A] mb-1">{lang === 'en' ? 'Cargo' : 'ጭነት'}</p>
            <p className="font-medium">{cargo?.[lang]}</p>
          </div>
          <div>
            <p className="text-[#57606A] mb-1">{lang === 'en' ? 'Weight' : 'ክብደት'}</p>
            <p className="font-medium">
              {state.weight} {state.weightUnit === 'quintals' ? (lang === 'en' ? 'quintals' : 'ኩንታል') : 'kg'}
            </p>
          </div>
        </div>

        {/* Time Critical Warning */}
        {cargo?.isTimeCritical && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3 items-start">
            <AlertTriangle className="text-red-600 shrink-0" size={18} />
            <div className="text-xs text-red-800">
              <p className="font-bold uppercase mb-1">
                {lang === 'en' ? '⚠ TIME-CRITICAL CARGO' : '⚠ አጣዳፊ ጭነት'}
              </p>
              <p>
                {lang === 'en' 
                  ? `${cargo.maxTransitHours}h transit maximum. Acceptance window is 5 minutes once a driver is matched.`
                  : `${cargo.maxTransitHours} ሰዓት ከፍተኛ የመጓጓዣ ጊዜ። ሹፌር ሲገኝ በ 5 ደቂቃ ውስጥ መቀበል አለብዎት።`}
              </p>
            </div>
          </div>
        )}

        {/* Pricing Table */}
        <div className="space-y-2 pt-4 border-t border-dashed border-[#D0D7DE]">
          <div className="flex justify-between text-sm">
            <span className="text-[#57606A]">{lang === 'en' ? 'Base freight rate' : 'መነሻ ዋጋ'}</span>
            <span>{formatCurrency(estimate.baseRate)}</span>
          </div>
          
          {estimate.cargoAdjustment > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#57606A]">{lang === 'en' ? 'Cargo type adjustment' : 'የጭነት ዓይነት ማስተካከያ'}</span>
              <span>+ {formatCurrency(estimate.cargoAdjustment)}</span>
            </div>
          )}

          {isRainy() && (
            <div className="flex justify-between text-sm text-[#BA7517]">
              <span>{lang === 'en' ? 'Seasonal adjustment' : 'የወቅት ማስተካከያ'}</span>
              <span>+ {formatCurrency(estimate.seasonalAdjustment)}</span>
            </div>
          )}

          <div className="pt-4 mt-2 border-t border-[#D0D7DE]">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-[#57606A] uppercase font-bold tracking-wider">
                  {lang === 'en' ? 'ESTIMATED TOTAL' : 'ጠቅላላ ግምት'}
                </p>
                <p className="text-2xl font-bold text-[#0F6E56]">
                  {formatCurrency(estimate.total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#57606A] uppercase">
                  {lang === 'en' ? 'Estimated Range' : 'የዋጋ ክልል'}
                </p>
                <p className="text-xs font-medium text-[#57606A]">
                  {formatCurrency(estimate.minRange)} – {formatCurrency(estimate.maxRange)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {estimate.savingsVsBroker != null && estimate.savingsPct != null && estimate.savingsPct > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-800">
            <p className="font-bold mb-0.5">
              {lang === 'en' ? `Save ~${estimate.savingsPct}% vs traditional broker` : `ከባህላዊ ደላላ ~${estimate.savingsPct}% ቆጣቢ`}
            </p>
            <p className="text-green-700">
              {lang === 'en'
                ? `Estimated broker cost: ${formatCurrency(estimate.total + estimate.savingsVsBroker)}`
                : `ግምታዊ የደላላ ዋጋ፦ ${formatCurrency(estimate.total + estimate.savingsVsBroker)}`}
            </p>
          </div>
        )}

        <div className="text-[11px] text-[#57606A] italic leading-relaxed">
          <p>{lang === 'en' ? 'This is an estimate. Actual price may vary based on truck availability, road conditions, and negotiation.' : 'ይህ ግምት ነው። ትክክለኛው ዋጋ ሊለያይ ይችላል።'}</p>
        </div>

        <div className="space-y-3 pt-2">
          <Button className="w-full bg-[#0F6E56] hover:bg-[#0D5C48] text-white h-12 text-base font-bold">
            {lang === 'en' ? 'Post This Load' : 'ጭነቱን ልጥፍ'}
          </Button>
          <Button variant="outline" className="w-full border-[#D0D7DE] text-[#1C2329] h-11">
            {lang === 'en' ? 'Get Exact Quote' : 'ትክክለኛ ዋጋ ይጠይቁ'}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#57606A]">
          <CheckCircle2 size={14} className="text-[#1D9E75]" />
          <span>{lang === 'en' ? 'Trusted by 1,200+ traders across Ethiopia' : 'በኢትዮጵያ ከ1,200 በላይ ነጋዴዎች የታመነ'}</span>
        </div>
      </div>
    </div>
  );
};

const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);