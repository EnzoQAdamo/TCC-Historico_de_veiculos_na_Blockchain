import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { switchWallet, checkUserRole, getAtorName } from '../config/blockchain';

interface AuthContextType {
  address: string | null;
  role: string | null;
  name: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-check on mount
  useEffect(() => {
    const autoConnect = async () => {
      // @ts-ignore
      if (window.ethereum) {
        try {
          // @ts-ignore
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) await loadRoleForAddress(accounts[0]);
        } catch (err) {
          console.error("Auto-connect failed", err);
        }
      }
      setIsLoading(false);
    };
    autoConnect();

    // @ts-ignore
    if (window.ethereum) {
      // Listener para troca de conta — recebe o novo endereço diretamente
      // @ts-ignore
      const onAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) loadRoleForAddress(accounts[0]);
        else logout();
      };
      // @ts-ignore
      window.ethereum.on('accountsChanged', onAccountsChanged);
      // @ts-ignore
      return () => window.ethereum.removeListener('accountsChanged', onAccountsChanged);
    }
  }, []);

  const loadRoleForAddress = async (addr: string) => {
    setIsLoading(true);
    try {
      const roleName = await checkUserRole(addr);
      const entityName = await getAtorName(addr);
      setAddress(addr);
      setRole(roleName);
      setName(entityName);
    } catch (err) {
      console.error("loadRoleForAddress error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    setIsLoading(true);
    try {
      const signer = await switchWallet();
      const addr = await signer.getAddress();
      await loadRoleForAddress(addr);
    } catch (err: any) {
      console.error("connect error", err);
      alert(err?.message || "Não foi possível conectar a carteira. Tente novamente.");
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAddress(null);
    setRole(null);
    setName(null);
  };

  return (
    <AuthContext.Provider value={{ 
      address, 
      role, 
      name,
      isConnected: !!address, 
      isLoading, 
      connect, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
