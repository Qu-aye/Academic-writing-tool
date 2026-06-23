import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { firebaseAuth, googleAuthProvider } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      getIdToken: () => user?.getIdToken() ?? Promise.resolve(null),
      signInWithGoogle: async () => {
        await signInWithPopup(firebaseAuth, googleAuthProvider);
      },
      signOutUser: () => signOut(firebaseAuth),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
