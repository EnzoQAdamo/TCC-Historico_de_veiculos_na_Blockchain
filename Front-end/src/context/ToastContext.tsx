import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
  blockUI: (message: string, txHash?: string) => void;
  unblockUI: () => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {}, blockUI: () => {}, unblockUI: () => {} });

export const useToast = () => useContext(ToastContext);

const CONFIGS = {
  success: { icon: CheckCircle2, bg: 'bg-green-500',  shadow: 'shadow-green-500/30',  text: 'text-white', iconColor: 'text-white/80' },
  error:   { icon: XCircle,      bg: 'bg-red-500',    shadow: 'shadow-red-500/30',    text: 'text-white', iconColor: 'text-white/80' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500', shadow: 'shadow-amber-500/30',  text: 'text-white', iconColor: 'text-white/80' },
  info:    { icon: Info,          bg: 'bg-blue-600',  shadow: 'shadow-blue-600/30',   text: 'text-white', iconColor: 'text-white/80' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [txState, setTxState] = useState<{ message: string; hash?: string } | null>(null);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    const timeout = type === 'error' ? 8000 : 5000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout);
  }, []);

  const blockUI = useCallback((message: string, txHash?: string) => setTxState({ message, hash: txHash }), []);
  const unblockUI = useCallback(() => setTxState(null), []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast, blockUI, unblockUI }}>
      {children}

      {/* Blockchain tx overlay */}
      {txState && (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl p-10 flex flex-col items-center gap-6 w-[380px] max-w-[90vw] text-center mx-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
              <div className={`absolute inset-0 rounded-full border-[3px] border-transparent animate-spin ${txState.hash ? 'border-t-blue-600' : 'border-t-amber-500'}`} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">
                {txState.hash ? 'Blockchain' : 'MetaMask'}
              </p>
              <p className="text-gray-800 font-bold text-base leading-snug">{txState.message}</p>
              <p className="text-gray-400 font-medium text-xs leading-snug mt-2">
                {txState.hash
                  ? 'Sua informação está sendo gravada de forma permanente e segura na rede. Isso costuma levar alguns segundos.'
                  : 'Abra a extensão do MetaMask (ícone da raposa no navegador) e clique em "Confirmar" para continuar.'}
              </p>
            </div>
            {txState.hash && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 w-full justify-center">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Tx</span>
                <span className="text-[10px] font-mono text-gray-500 select-all">
                  {txState.hash.slice(0, 12)}...{txState.hash.slice(-6)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${txState.hash ? 'bg-green-400' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                {txState.hash ? 'Rede Ethereum' : 'Aguardando aprovação'}
              </span>
            </div>
            <p className="text-[10px] font-medium text-gray-300 italic">Não feche ou atualize esta página</p>
          </div>
        </div>
      )}

      {/* Toast stack — bottom center */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 items-center pointer-events-none">
        {toasts.map(t => {
          const c = CONFIGS[t.type];
          const Icon = c.icon;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-4 px-7 py-5 rounded-2xl shadow-2xl ${c.shadow} ${c.bg} pointer-events-auto min-w-[420px] max-w-[580px] animate-slideUp`}
            >
              <Icon className={`w-6 h-6 flex-shrink-0 ${c.iconColor}`} />
              <span className={`text-sm font-bold flex-1 leading-snug ${c.text}`}>{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-white/60 hover:text-white flex-shrink-0 transition-colors ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
