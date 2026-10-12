// ===========================================================================
// The banner at the top of Make a Payment once a payment has been attempted.
//
//   success  Figma 12949-90476 — green card: tick, "Thank you for your
//            payment", the payment's number / amount / method, and the
//            "receipt has been sent" row with Resend.
//   failed   Figma 12950-91405 — red card that REPLACES the green one: just
//            "Payment Failed" and what to do next. The frame has no icon, and
//            its text starts where the success card's does.
//
// STATIC: the receipt below is PAYMENT_RECEIPT_DEMO (data.ts), and Resend does
// nothing. Both are for wiring to the real payment response.
// ===========================================================================

import { CheckTickCircleIcon, MessageIcon } from './icons';
import type { PaymentReceipt } from './data';

export type PaymentOutcome = 'success' | 'failed';

export function PaymentResult({
  outcome, receipt, onResend,
}: {
  outcome: PaymentOutcome;
  receipt: PaymentReceipt;
  onResend?: () => void;
}) {
  if (outcome === 'failed') {
    return (
      <div className="ma-result ma-result--failed" role="alert">
        <p className="ma-result__title">Payment Failed</p>
        <p className="ma-result__sub ma-result__sub--failed">
          Your payment could not be processed. Please try a different payment method or contact your bank for
          assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="ma-result ma-result--success" role="status">
      <div className="ma-result__top">
        <CheckTickCircleIcon className="ma-result__tick" />
        <div className="ma-result__text">
          <p className="ma-result__title">Thank you for your payment</p>
          <p className="ma-result__sub">Your transaction has been processed successfully</p>
          <p className="ma-result__details">
            Payment Number: {receipt.number}
            <br />
            Payment Amount: {receipt.amount}
            <br />
            Payment Method: {receipt.method}
          </p>
        </div>
      </div>
      <div className="ma-result__receipt">
        <MessageIcon className="ma-result__msgIcon" />
        <p className="ma-result__sent">Your payment receipt has been sent to your email and phone.</p>
        <button type="button" className="ma-result__resend" onClick={onResend}>Resend</button>
      </div>
    </div>
  );
}
