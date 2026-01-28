// ============================================
// SCHOOL FEE CONFIGURATION
// Change these values to update fees per class
// ============================================

export const SCHOOL_FEES: Record<string, number> = {
  JSS1: 1000,
  JSS2: 1000,
  JSS3: 1000,
  SS1: 1000,
  SS2: 1000,
  SS3: 1000,
};

// Installment configuration
export const INSTALLMENT_CONFIG = {
  downPaymentPercent: 20,
  weeklyMaxPayments: 12,
  monthlyMaxPayments: 3,
};

// Calculate installment details
export const calculateInstallment = (
  totalFee: number,
  frequency: 'WEEKLY' | 'MONTHLY',
  customCount?: number
) => {
  const downPayment = Math.ceil((totalFee * INSTALLMENT_CONFIG.downPaymentPercent) / 100);
  const remainingAmount = totalFee - downPayment;

  let numberOfPayments = frequency === 'WEEKLY'
    ? INSTALLMENT_CONFIG.weeklyMaxPayments
    : INSTALLMENT_CONFIG.monthlyMaxPayments;

  // Use custom count if provided and within valid range
  if (customCount) {
    const max = frequency === 'WEEKLY' ? 12 : 3;
    if (customCount > 0 && customCount <= max) {
      numberOfPayments = customCount;
    }
  }

  const amountPerPayment = Math.ceil(remainingAmount / numberOfPayments);

  return {
    downPayment,
    remainingAmount,
    numberOfPayments,
    amountPerPayment,
    frequency,
  };
};

// Format currency in Naira
export const formatNaira = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Nigerian Banks List
export const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Globus Bank', code: '103' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

export const CLASS_GRADES = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'] as const;
export type ClassGrade = typeof CLASS_GRADES[number];
