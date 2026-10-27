import { formatNaira } from '@/lib/feeConfig';
import type { InvoicePaymentDetails } from '@/types/payment-api';

/** Invoice terms are planned charges; they are never evidence of a collection. */
export default function PaymentTermsSummary({ payment }: { payment: InvoicePaymentDetails }) {
  const terms = payment.terms;
  const type = payment.paymentType?.toUpperCase() ?? 'UNKNOWN';
  const recurring = type === 'INSTALLMENT' || type === 'SUBSCRIPTION';
  return (
    <div className="space-y-3">
      <div className="p-4 bg-secondary rounded-xl">
        <p className="text-sm text-muted-foreground">{type === 'SUBSCRIPTION' ? 'Charge per cycle' : 'Invoice amount'}</p>
        <p className="text-2xl font-bold text-primary">{formatNaira(type === 'SUBSCRIPTION' ? terms?.amountPerCycle ?? payment.amount : payment.amount)}</p>
      </div>
      {type === 'INSTALLMENT' && (
        <div className="space-y-2 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">Planned down payment: {formatNaira(payment.downPayment)}</p>
          {terms?.installmentAmounts?.length ? (
            <ol className="text-sm space-y-1 max-h-48 overflow-y-auto" aria-label="Exact installment schedule">
              {terms.installmentAmounts.map((amount, index, amounts) => (
                <li key={index} className="flex justify-between gap-3">
                  <span>Installment {index + 1}{index === amounts.length - 1 ? ' (final)' : ''}</span>
                  <span>{formatNaira(amount)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">Exact installment schedule unavailable.</p>}
          <p className="text-xs text-muted-foreground">Amounts include the backend's exact rounding allocation; the final installment is shown explicitly.</p>
        </div>
      )}
      {recurring && (
        <div className="text-sm space-y-1">
          <p>Frequency: {terms?.frequency?.toLowerCase() ?? 'Unavailable'}</p>
          <p>First scheduled charge: {terms?.firstBillingDate ? terms.firstBillingDate.replace('T', ' ') + ' (Africa/Lagos)' : 'Unavailable'}</p>
          {type === 'SUBSCRIPTION' && <p>Unlimited subscription: no fixed total balance or automatic end date.</p>}
        </div>
      )}
    </div>
  );
}