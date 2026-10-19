import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Letterhead, subscribeToLetterhead } from '../services/brandingService';

// Live letterhead for the signed-in business (null when none is set)
export function useLetterhead(): { letterhead: Letterhead | null; isLoading: boolean } {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [state, setState] = useState<{ letterhead: Letterhead | null; isLoading: boolean }>({ letterhead: null, isLoading: true });

  useEffect(() => {
    if (!uid) {
      setState({ letterhead: null, isLoading: false });
      return;
    }
    return subscribeToLetterhead(uid, (letterhead) => setState({ letterhead, isLoading: false }));
  }, [uid]);

  return state;
}
