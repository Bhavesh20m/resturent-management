import React, { useState } from 'react';
import {
  X,
  BellRing,
  Droplets,
  UtensilsCrossed,
  HelpCircle,
  Receipt,
  MessageSquare,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { ServiceRequestType, ServiceRequest } from '../../types';
import { createServiceRequest } from '../../services/db';
import { DEMO_RESTAURANT_ID } from '../../data/initialDemoData';

interface ServiceRequestModalProps {
  tableNumber: number;
  tableId: string;
  existingRequests: ServiceRequest[];
  onClose: () => void;
  onRequestSent: () => void;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  tableNumber,
  tableId,
  existingRequests,
  onClose,
  onRequestSent,
}) => {
  const [selectedType, setSelectedType] = useState<ServiceRequestType>('call_waiter');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedType, setSubmittedType] = useState<string | null>(null);

  // Check for duplicate pending requests for this table
  const pendingRequestsForTable = existingRequests.filter(
    (r) => r.tableId === tableId && r.status !== 'resolved'
  );

  const requestOptions: {
    type: ServiceRequestType;
    label: string;
    description: string;
    icon: React.ElementType;
    isBill?: boolean;
  }[] = [
    {
      type: 'call_waiter',
      label: 'Call Waiter to Table',
      description: 'Your assigned floor server will attend to your table shortly',
      icon: BellRing,
    },
    {
      type: 'water',
      label: 'Request Drinking Water',
      description: 'Chilled regular or bottled mineral water refill',
      icon: Droplets,
    },
    {
      type: 'cutlery',
      label: 'Request Fresh Cutlery',
      description: 'Extra plates, spoons, forks, napkins or bowls',
      icon: UtensilsCrossed,
    },
    {
      type: 'assistance',
      label: 'Special Assistance',
      description: 'Menu guidance, dietary inquiries, or chair adjustment',
      icon: HelpCircle,
    },
    {
      type: 'bill',
      label: 'Request Final Bill',
      description: 'Printed tax invoice and demo payment options at table',
      icon: Receipt,
      isBill: true,
    },
    {
      type: 'other',
      label: 'Other Inquiries',
      description: 'Custom notes or feedback directly to floor manager',
      icon: MessageSquare,
    },
  ];

  const handleSendRequest = async () => {
    // Duplicate check
    const isAlreadyPending = pendingRequestsForTable.some((r) => r.type === selectedType);
    if (isAlreadyPending) {
      alert(`A pending request for "${selectedType.replace('_', ' ')}" is already active for Table ${tableNumber}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createServiceRequest({
        restaurantId: DEMO_RESTAURANT_ID,
        tableId,
        tableNumber,
        type: selectedType,
        notes: notes.trim() || undefined,
      });
      setSubmittedType(selectedType);
      onRequestSent();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Service request error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Table {tableNumber} Service Request</h3>
              <p className="text-[11px] text-slate-500">Instant notification to floor captain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedType ? (
          <div className="p-8 flex flex-col items-center text-center animate-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Request Dispatched!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Your server has been notified for Table {tableNumber}. Someone is on their way.
            </p>
          </div>
        ) : (
          <div className="p-5 max-h-[75vh] overflow-y-auto">
            {/* Show any currently pending request */}
            {pendingRequestsForTable.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200/80">
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Active Requests in Progress:
                </span>
                <div className="space-y-1">
                  {pendingRequestsForTable.map((req) => (
                    <div
                      key={req.id}
                      className="text-xs text-amber-900 flex items-center justify-between bg-white/70 px-2 py-1 rounded border border-amber-200/50"
                    >
                      <span className="capitalize font-medium">{req.type.replace('_', ' ')}</span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-700 mb-2.5">Select Request Type:</p>

            <div className="grid grid-cols-1 gap-2 mb-4">
              {requestOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedType === opt.type;
                const isAlreadyPending = pendingRequestsForTable.some((r) => r.type === opt.type);

                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={isAlreadyPending}
                    onClick={() => setSelectedType(opt.type)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? opt.isBill
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : isAlreadyPending
                        ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? opt.isBill
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                          {opt.label}
                        </span>
                        {isAlreadyPending && (
                          <span className="text-[10px] text-amber-600 font-semibold">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Optional note */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Additional Note / Specific Requirement (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Extra lemons, warmer water, baby chair..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={100}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
              />
            </div>

            <button
              onClick={handleSendRequest}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors ${
                selectedType === 'bill'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Notifying Waiter...
                </>
              ) : selectedType === 'bill' ? (
                'Request Table Bill Now'
              ) : (
                'Send Request to Floor Staff'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
