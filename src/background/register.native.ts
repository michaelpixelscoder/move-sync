import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { getClientKey } from '../lib/session';
import { syncCollection } from '../features/autosync/services/syncCollection';

const TASK_NAME = 'move-sync-enabled-collections';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const clientKey = await getClientKey(); const collections = await convex.query(api.collections.listEnabled, { clientKey });
    for (const collection of collections) await syncCollection(clientKey, collection);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) { console.error('Move Sync background task failed', error); return BackgroundTask.BackgroundTaskResult.Failed; }
});

void TaskManager.isTaskRegisteredAsync(TASK_NAME).then(async registered => { if (!registered && await BackgroundTask.getStatusAsync() === BackgroundTask.BackgroundTaskStatus.Available) await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 }); }).catch(error => console.warn('Unable to register Move Sync background task', error));
