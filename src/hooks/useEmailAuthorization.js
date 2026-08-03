import { useEffect, useState } from 'react';

export function useEmailAuthorization(user, subscription) {
  const [checking, setChecking] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!user || !user.email || !user.uid) return;

    // Solo verificar si el usuario NO tiene acceso activo
    if (subscription.isActive) {
      setAuthorized(true);
      return;
    }

    const checkAuthorization = async () => {
      setChecking(true);
      try {
        const res = await fetch('/api/verify-authorized-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email })
        });

        if (res.ok) {
          const data = await res.json();
          setAuthorized(data.success);
        }
      } catch (error) {
        console.error('Error checking email authorization:', error);
      } finally {
        setChecking(false);
      }
    };

    checkAuthorization();
  }, [user, subscription.isActive]);

  return { authorized, checking };
}
