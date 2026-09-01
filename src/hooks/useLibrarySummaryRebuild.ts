import { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/** Pages through legacy rows once after deployment; incomplete summaries are never UI-ready. */
export function useLibrarySummaryRebuild(clientKey: string | undefined) {
  const summary = useQuery(api.media.summary, clientKey ? { clientKey } : 'skip');
  const rebuildPage = useMutation(api.media.rebuildSummaryPage);
  const cursor = useRef<string | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (!clientKey || !summary || summary.isComplete || running.current) return;
    running.current = true;
    void rebuildPage({ clientKey, cursor: cursor.current, pageSize: 100 })
      .then(result => { cursor.current = result.continueCursor; })
      .catch(() => undefined)
      .finally(() => { running.current = false; });
  }, [clientKey, rebuildPage, summary]);

  return summary;
}
