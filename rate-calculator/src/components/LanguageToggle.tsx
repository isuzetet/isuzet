import { Language } from '../types/calculator';

interface Props {
  lang: Language;
  setLang: (l: Language) => void;
}

export const LanguageToggle = ({ lang, setLang }: Props) => {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-[#0F6E56] text-white' : 'text-[#57606A] hover:bg-gray-100'}`}
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLang('am')}
        className={`px-2 py-1 rounded transition-colors ${lang === 'am' ? 'bg-[#0F6E56] text-white' : 'text-[#57606A] hover:bg-gray-100'}`}
      >
        አማ
      </button>
    </div>
  );
};