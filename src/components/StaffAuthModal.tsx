import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, ArrowRight, Utensils, CheckCircle2, AlertCircle } from 'lucide-react';
import { StaffMember } from '../types';
import { initialStaff } from '../data/initialDemoData';

interface StaffAuthModalProps {
  onAuthenticated: (staff: StaffMember) => void;
  onExitToCustomer: () => void;
  targetRole?: string;
}

export const StaffAuthModal: React.FC<StaffAuthModalProps> = ({
  onAuthenticated,
  onExitToCustomer,
  targetRole = 'staff',
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaff[0].id);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Default demo PIN mapping for easy testing
  const staffPinMap: Record<string, string> = {
    'staff-1': '1234', // Ramesh (Owner)
    'staff-2': '1234', // Priya (Manager)
    'staff-3': '2345', // Vikram (Waiter)
    'staff-4': '2345', // Sunita (Waiter)
    'staff-5': '2345', // Arjun (Waiter)
    'staff-6': '2345', // Rahul (Waiter)
    'staff-7': '3456', // Mohan (Head Chef)
    'staff-8': '3456', // Dev (Line Cook)
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = staffPinMap[selectedStaffId] || '1234';
    if (pin === correctPin || pin === '1234' || pin === '0000') {
      const member = initialStaff.find((s) => s.id === selectedStaffId) || initialStaff[0];
      onAuthenticated(member);
    } else {
      setError(`Incorrect PIN. Demo PINs: Owner (1234), Waiter (2345), Kitchen (3456)`);
    }
  };

  const handleQuickLogin = (staffId: string) => {
    const member = initialStaff.find((s) => s.id === staffId) || initialStaff[0];
    onAuthenticated(member);
  };

  const selectedMember = initialStaff.find((s) => s.id === selectedStaffId) || initialStaff[0];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Staff Authentication Required</h2>
          <p className="text-xs text-slate-400 mt-1">
            Restricted portal. Customers please use your table's NFC card.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Staff Member:
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {initialStaff.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setSelectedStaffId(s.id);
                    setError('');
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors ${
                    selectedStaffId === s.id
                      ? 'bg-slate-800 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                      {s.avatarInitials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{s.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{s.role}</div>
                    </div>
                  </div>
                  {selectedStaffId === s.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Staff PIN Code:
              </label>
              <span className="text-[10px] text-slate-400">
                Demo PIN: {staffPinMap[selectedStaffId]}
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder={`Enter PIN for ${selectedMember.name.split(' ')[0]}`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            Verify Staff PIN & Enter
          </button>
        </form>

        {/* Quick Demo One-Click Access */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 mb-2 text-center uppercase tracking-wider">
            Quick Demo 1-Click Login:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('staff-1')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-medium text-slate-200 border border-slate-700 text-center transition-colors cursor-pointer"
            >
              Owner
            </button>
            <button
              onClick={() => handleQuickLogin('staff-3')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-medium text-slate-200 border border-slate-700 text-center transition-colors cursor-pointer"
            >
              Waiter
            </button>
            <button
              onClick={() => handleQuickLogin('staff-7')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] font-medium text-slate-200 border border-slate-700 text-center transition-colors cursor-pointer"
            >
              Kitchen
            </button>
          </div>
        </div>

        {/* Exit back to customer experience */}
        <div className="mt-6 text-center">
          <button
            onClick={onExitToCustomer}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            <Utensils className="w-3.5 h-3.5" />
            Visiting as a Customer? Open Table 5 Digital Menu
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
