import { format } from 'date-fns';
// @ts-ignore
import { EthDateTime } from 'ethiopian-date';

export const formatWithEthiopian = (date: Date) => {
  const greg = format(date, 'EEE MMM dd');
  try {
    const ethDate = EthDateTime.fromJSDate(date);
    const amharicDays = ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];
    const amharicMonths = [
      'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 
      'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
    ];
    
    const day = amharicDays[date.getDay()];
    const ethDay = ethDate.date;
    const ethMonth = amharicMonths[ethDate.month - 1];
    
    // Convert to Ge'ez numerals for extra authenticity if needed, 
    // but standard numerals are often used in modern OPS tools.
    return `${greg} · ${day} ${ethDay} ${ethMonth}`;
  } catch (e) {
    return greg;
  }
};

export const formatETB = (amount: number) => {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount).replace('ETB', 'ETB ');
};