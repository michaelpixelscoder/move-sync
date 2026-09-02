import { useEffect, useState } from 'react';
import { getClientKey } from '../lib/session';
export function useClientKey() {
  const [clientKey, setClientKey] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    getClientKey()
      .then(setClientKey)
      .catch((value) =>
        setError(
          value instanceof Error
            ? value.message
            : 'Unable to create this device identity',
        ),
      );
  }, []);
  return { clientKey, error };
}
