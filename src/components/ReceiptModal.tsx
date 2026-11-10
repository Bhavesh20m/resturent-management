import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Bill, Restaurant } from '../types';

interface ReceiptModalProps {
  bill: Bill;
  restaurant: Restaurant | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ bill, restaurant, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = restaurant?.currencySymbol || '₹';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 print:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Official Receipt Preview
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-8 overflow-y-auto text-slate-800 font-mono text-xs bg-white space-y-4 print:p-0 print:m-0">
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <h2 className="text-base font-bold tracking-tight text-slate-950 font-sans">
              {restaurant?.name || 'DINEFLOW RESTAURANT'}
            </h2>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">{restaurant?.cuisine}</p>
            <p className="text-[10px] text-slate-400 font-sans">{restaurant?.address}</p>
            <p className="text-[10px] text-slate-400 font-sans">Phone: {restaurant?.phone}</p>
            <p className="text-[10px] text-slate-400 font-sans mt-1">GSTIN: 07AAAAA0000A1Z5</p>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <div>
              <p>TABLE: <span className="font-bold">{bill.tableNumber}</span></p>
              <p>BILL ID: {bill.id}</p>
            </div>
            <div className="text-right">
              <p>DATE: {new Date(bill.createdAt).toLocaleDateString('en-IN')}</p>
              <p>TIME: {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-slate-300 py-2">
            <div className="flex justify-between font-bold text-slate-900 mb-2">
              <span>ORDER / PARTICULARS</span>
              <span>AMOUNT</span>
            </div>
            {bill.ordersSummary?.map((ord, i) => (
              <div key={i} className="flex justify-between py-0.5 text-slate-700">
                <span>{ord.orderNumber} ({ord.itemsCount} items)</span>
                <span>{currencySymbol}{ord.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{currencySymbol}{bill.subtotal.toFixed(2)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{currencySymbol}{bill.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>CGST (2.5%) + SGST (2.5%)</span>
              <span>{currencySymbol}{bill.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Service Charge (5%)</span>
              <span>{currencySymbol}{bill.serviceCharge.toFixed(2)}</span>
            </div>
            {bill.tip > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Staff Tip</span>
                <span>{currencySymbol}{bill.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-950 pt-2 border-t border-slate-200">
              <span>GRAND TOTAL</span>
              <span>{currencySymbol}{bill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Amount Paid:</span>
              <span className="font-semibold text-emerald-600">{currencySymbol}{bill.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Remaining Balance:</span>
              <span className="font-semibold">{currencySymbol}{bill.balanceRemaining.toFixed(2)}</span>
            </div>
            {bill.payments && bill.payments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">TRANSACTION DETAILS:</span>
                {bill.payments.map((p, idx) => (
                  <div key={idx} className="text-[10px] text-slate-500 flex justify-between">
                    <span>{p.method.toUpperCase()} ({p.transactionId})</span>
                    <span>{currencySymbol}{p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center pt-3 text-[10px] text-slate-400 font-sans border-t border-dashed border-slate-300">
            <p className="flex items-center justify-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {bill.status === 'PAID' ? 'FULLY SETTLED' : 'PARTIALLY SETTLED'}
            </p>
            <p className="mt-1">Thank you for dining with DineFlow!</p>
            <div className="mt-3 p-1.5 bg-slate-50 rounded border border-slate-200 text-[9px] text-slate-500">
              DEMO PAYMENT ENVIRONMENT — NO REAL MONEY CHARGED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
