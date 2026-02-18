import create from 'zustand';

export interface User {
  address: string;
  role: 'admin' | 'contractor' | 'authority';
  isConnected: boolean;
}

export interface WalletState {
  balance: string;
  gasPrice: string;
  symbol: string;
}

export interface AppStoreState {
  user: User | null;
  wallet: WalletState;
  setUser: (user: User) => void;
  setWallet: (wallet: WalletState) => void;
  clearUser: () => void;
  updateBalance: (balance: string) => void;
}

export const useStore = create<AppStoreState>((set) => ({
  user: null,
  wallet: {
    balance: '0',
    gasPrice: '0',
    symbol: 'ETH',
  },
  setUser: (user) => set({ user }),
  setWallet: (wallet) => set({ wallet }),
  clearUser: () => set({ user: null }),
  updateBalance: (balance) =>
    set((state) => ({
      wallet: { ...state.wallet, balance },
    })),
}));
