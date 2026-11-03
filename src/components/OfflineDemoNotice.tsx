import { Info } from 'lucide-react';

export default function OfflineDemoNotice() {
  return (
    <div role="note" className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <strong>OFFLINE DEMO — synthetic payments only.</strong>
        <p>Account details are demonstration metadata. Do not transfer money or enter real banking details.
          No bank transfer, debit or automatic payment confirmation occurs.</p>
      </div>
    </div>
  );
}
