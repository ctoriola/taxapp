import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClientLink, isEmailVerified, subscribeToMyClients } from '../services/accountantService';

// Businesses that have given the signed-in (verified) email accountant access
export function useMyClients(): ClientLink[] {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientLink[]>([]);
  useEffect(() => {
    if (!user?.email || !isEmailVerified()) return;
    return subscribeToMyClients(user.email, (list) => setClients(list || []));
  }, [user?.email]);
  return clients;
}
