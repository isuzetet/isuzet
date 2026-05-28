import React, { useState, useEffect } from 'react';
import { Language, CalculatorState, EstimateResponse } from '../types/calculator';
import { ZONES, CARGO_TYPES, getDistance } from '../constants/data';
import { LanguageToggle } from '../components/LanguageToggle';
import { RoutePreview } from '../components/RoutePreview';
import { ResultCard } from '../components/ResultCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Calendar, Info, Wheat, Coffee, Beef, Apple, Milk, BrickWall, Construction, Package, Leaf, Fish, Cloud, Hexagon } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

const iconMap: Record<string, any> = {
  Wheat, Coffee, Beef, Apple, Milk, Brick: BrickWall, Construction, Package, Leaf, Fish, Cloud, Hexagon
};

const Index = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('isuzet_lang');
    return (saved as Language) || 'en';
  });

  const [state, setState] = useState<CalculatorState>({
    originZone: '',
    destZone: '',
    cargoType: '',
    weight: 0,
    weightUnit: 'quintals',
    pickupDate: '',
    paymentModel: 'ESCROW'
  });

  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('isuzet_lang', lang);
  }, [lang]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!state.originZone) newErrors.originZone = lang === 'en' ? 'Required' : 'ያስፈልጋል';
    if (!state.destZone) newErrors.destZone = lang === 'en' ? 'Required' : 'ያስፈልጋል';
    if (state.originZone && state.originZone === state.destZone) {
      newErrors.destZone = lang === 'en' ? 'Cannot be same as origin' : 'ከመነሻው ጋር አንድ መሆን አይችልም';
    }
    if (!state.cargoType) newErrors.cargoType = lang === 'en' ? 'Required' : 'ያስፈልጋል';
    if (state.weight <= 0) newErrors.weight = lang === 'en' ? 'Invalid weight' : 'ትክክለኛ ያልሆነ ክብደት';
    if (!state.pickupDate) newErrors.pickupDate = lang === 'en' ? 'Required' : 'ያስፈልጋል';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = async () => {
    if (!validate()) return;

    setLoading(true);
    setEstimate(null);

    try {
      const weightKg = state.weightUnit === 'quintals' ? state.weight * 100 : state.weight;
      const originZone = ZONES.find(z => z.id === state.originZone);
      const destZone = ZONES.find(z => z.id === state.destZone);

      const params = new URLSearchParams({
        originZoneName: originZone?.en ?? state.originZone,
        destZoneName: destZone?.en ?? state.destZone,
        cargoType: state.cargoType,
        weightKg: weightKg.toString(),
        pickupDate: state.pickupDate,
      });

      const apiBase = import.meta.env.VITE_CORRIDOR_API_BASE ?? 'http://localhost:3003';
      const response = await fetch(`${apiBase}/api/v1/public-estimate?${params}`);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error?.message ?? `Server error (${response.status})`);
      }

      setEstimate(body.data);
      showSuccess(lang === 'en' ? 'Estimate calculated!' : 'ግምቱ ተሰልቷል!');
    } catch (err: unknown) {
      showError(
        err instanceof Error
          ? err.message
          : (lang === 'en' ? 'Unable to calculate estimate. Please try again.' : 'ግምቱን ማስላት አልተቻለም። እባክዎ እንደገና ይሞክሩ።')
      );
    } finally {
      setLoading(false);
    }
  };

  const isRainySeason = () => {
    if (!state.pickupDate) return false;
    const month = new Date(state.pickupDate).getMonth();
    return month >= 5 && month <= 8;
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#1C2329]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-[#0F6E56]">ISUZET</h1>
            <p className="text-xs text-[#57606A] font-medium uppercase tracking-widest">Freight Calculator</p>
          </div>
          <LanguageToggle lang={lang} setLang={setLang} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-8">
            <RoutePreview origin={state.originZone} dest={state.destZone} lang={lang} />

            <div className="space-y-6">
              {/* Origin & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">{lang === 'en' ? 'From / ከ' : 'ከ'}</Label>
                  <Select value={state.originZone} onValueChange={(v) => setState(s => ({ ...s, originZone: v }))}>
                    <SelectTrigger className={`bg-[#F6F8FA] border-[#D0D7DE] ${errors.originZone ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={lang === 'en' ? 'Select origin' : 'መነሻ ይምረጡ'} />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z[lang]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.originZone && <p className="text-[10px] text-red-500 font-medium">{errors.originZone}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">{lang === 'en' ? 'To / ወደ' : 'ወደ'}</Label>
                  <Select value={state.destZone} onValueChange={(v) => setState(s => ({ ...s, destZone: v }))}>
                    <SelectTrigger className={`bg-[#F6F8FA] border-[#D0D7DE] ${errors.destZone ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={lang === 'en' ? 'Select destination' : 'መድረሻ ይምረጡ'} />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z[lang]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destZone && <p className="text-[10px] text-red-500 font-medium">{errors.destZone}</p>}
                </div>
              </div>

              {/* Cargo Type Grid */}
              <div className="space-y-3">
                <Label className="text-sm font-bold">{lang === 'en' ? 'Cargo Type / የጭነት ዓይነት' : 'የጭነት ዓይነት'}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CARGO_TYPES.map(cargo => {
                    const Icon = iconMap[cargo.icon] || Package;
                    const isSelected = state.cargoType === cargo.id;
                    return (
                      <button
                        key={cargo.id}
                        onClick={() => setState(s => ({ ...s, cargoType: cargo.id }))}
                        className={`relative p-4 rounded-xl border text-left transition-all group ${
                          isSelected 
                            ? 'border-[#0F6E56] bg-[#0F6E56]/5 ring-1 ring-[#0F6E56]' 
                            : 'border-[#D0D7DE] hover:border-[#0F6E56] bg-white'
                        }`}
                      >
                        <Icon size={24} className={`mb-2 ${isSelected ? 'text-[#0F6E56]' : 'text-[#57606A] group-hover:text-[#0F6E56]'}`} />
                        <p className="text-xs font-bold leading-tight">{cargo[lang]}</p>
                        {cargo.isTimeCritical && (
                          <Badge className="absolute top-2 right-2 bg-red-100 text-red-700 text-[8px] px-1 py-0 border-none">
                            {lang === 'en' ? 'CRITICAL' : 'አጣዳፊ'}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.cargoType && <p className="text-[10px] text-red-500 font-medium">{errors.cargoType}</p>}
              </div>

              {/* Weight */}
              <div className="space-y-3">
                <Label className="text-sm font-bold">{lang === 'en' ? 'Weight / ክብደት' : 'ክብደት'}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={state.weight || ''}
                      onChange={(e) => setState(s => ({ ...s, weight: parseFloat(e.target.value) || 0 }))}
                      className={`bg-[#F6F8FA] border-[#D0D7DE] h-12 pr-16 ${errors.weight ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#57606A]">
                      {state.weightUnit}
                    </div>
                  </div>
                  <div className="flex bg-[#F6F8FA] border border-[#D0D7DE] rounded-md p-1">
                    <button
                      onClick={() => setState(s => ({ ...s, weightUnit: 'quintals' }))}
                      className={`px-3 py-1 text-xs font-bold rounded transition-colors ${state.weightUnit === 'quintals' ? 'bg-white shadow-sm text-[#0F6E56]' : 'text-[#57606A]'}`}
                    >
                      {lang === 'en' ? 'Quintals' : 'ኩንታል'}
                    </button>
                    <button
                      onClick={() => setState(s => ({ ...s, weightUnit: 'kg' }))}
                      className={`px-3 py-1 text-xs font-bold rounded transition-colors ${state.weightUnit === 'kg' ? 'bg-white shadow-sm text-[#0F6E56]' : 'text-[#57606A]'}`}
                    >
                      kg
                    </button>
                  </div>
                </div>
                {state.weight > 0 && (
                  <p className="text-[10px] text-[#57606A] font-medium">
                    {state.weightUnit === 'quintals' 
                      ? `≈ ${(state.weight * 100).toLocaleString()} kg` 
                      : `≈ ${(state.weight / 100).toFixed(2)} ${lang === 'en' ? 'quintals' : 'ኩንታል'}`}
                  </p>
                )}
              </div>

              {/* Pickup Date */}
              <div className="space-y-3">
                <Label className="text-sm font-bold">{lang === 'en' ? 'Pickup Date / የሚነሳበት ቀን' : 'የሚነሳበት ቀን'}</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={state.pickupDate}
                    onChange={(e) => setState(s => ({ ...s, pickupDate: e.target.value }))}
                    className={`bg-[#F6F8FA] border-[#D0D7DE] h-12 pl-10 ${errors.pickupDate ? 'border-red-500' : ''}`}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#57606A]" size={18} />
                </div>
                {isRainySeason() && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 items-center animate-in fade-in slide-in-from-top-1">
                    <Info className="text-[#BA7517] shrink-0" size={18} />
                    <p className="text-xs text-[#BA7517] font-medium">
                      {lang === 'en' 
                        ? "ዝናብ ወቅት (Rainy Season) — a seasonal adjustment may apply to this route" 
                        : "የዝናብ ወቅት — በዚህ መስመር ላይ የወቅት ዋጋ ማስተካከያ ሊኖር ይችላል"}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Model */}
              <div className="space-y-3">
                <Label className="text-sm font-bold">{lang === 'en' ? 'Payment Model / የክፍያ ዘዴ' : 'የክፍያ ዘዴ'}</Label>
                <RadioGroup 
                  value={state.paymentModel} 
                  onValueChange={(v: any) => setState(s => ({ ...s, paymentModel: v }))}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${state.paymentModel === 'ESCROW' ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-[#D0D7DE]'}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="ESCROW" id="escrow" />
                      <Label htmlFor="escrow" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">ESCROW</span>
                          <Badge className="bg-[#1D9E75] text-white text-[8px] border-none">RECOMMENDED</Badge>
                        </div>
                        <p className="text-[10px] text-[#57606A]">{lang === 'en' ? 'Funds held securely until delivery confirmed' : 'ጭነቱ መድረሱ እስኪረጋገጥ ድረስ ገንዘቡ በአስተማማኝ ሁኔታ ይያዛል'}</p>
                      </Label>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${state.paymentModel === 'COD' ? 'border-[#0F6E56] bg-[#0F6E56]/5' : 'border-[#D0D7DE]'}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="COD" id="cod" />
                      <Label htmlFor="cod" className="cursor-pointer">
                        <span className="font-bold">COD</span>
                        <p className="text-[10px] text-[#57606A]">{lang === 'en' ? 'Cash on delivery at destination' : 'ጭነቱ መድረሻው ሲደርስ የሚከፈል'}</p>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Button 
                onClick={handleCalculate}
                disabled={loading}
                className="w-full bg-[#0F6E56] hover:bg-[#0D5C48] text-white h-14 text-lg font-bold shadow-lg shadow-[#0F6E56]/20"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : null}
                {lang === 'en' ? 'Get Estimate / ዋጋ አስሉ' : 'ዋጋ አስሉ'}
              </Button>
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-5 sticky top-8">
            {estimate ? (
              <ResultCard estimate={estimate} state={state} lang={lang} />
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center h-[600px] border-2 border-dashed border-[#D0D7DE] rounded-xl bg-[#F6F8FA] text-center p-8">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Info className="text-[#D0D7DE]" size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#57606A] mb-2">
                  {lang === 'en' ? 'Ready to calculate' : 'ለማስላት ዝግጁ'}
                </h3>
                <p className="text-sm text-[#57606A] max-w-[240px]">
                  {lang === 'en' 
                    ? 'Fill in the details to see your professional freight quotation.' 
                    : 'የጭነት ዋጋ ግምቱን ለማየት ዝርዝሩን ይሙሉ'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;