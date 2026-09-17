import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

type ClaimState =
  | { status: 'waiting'; error: null }
  | { status: 'claiming'; error: null }
  | { status: 'claimed'; error: null }
  | { status: 'error'; error: string };

export function useLibraryClaim(clientKey: string | undefined): ClaimState {
  const claimCurrent = useMutation(api.libraries.claimCurrent);
  const [state, setState] = useState<ClaimState>({
    status: 'waiting',
    error: null,
  });

  useEffect(() => {
    if (!clientKey) {
      setState({ status: 'waiting', error: null });
      return;
    }

    let cancelled = false;
    setState({ status: 'claiming', error: null });
    void claimCurrent({ clientKey })
      .then(() => {
        if (!cancelled) setState({ status: 'claimed', error: null });
      })
      .catch((reason) => {
        if (cancelled) return;
        const message =
          reason instanceof Error ? reason.message : String(reason);
        setState({
          status: 'error',
          error: /belongs to another account/i.test(message)
            ? 'This device library is already linked to another account.'
            : 'Unable to link this device library to your account.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [claimCurrent, clientKey]);

  return state;
}
