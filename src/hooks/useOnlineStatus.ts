import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** A shared connectivity signal for feedback states; it deliberately makes no delivery promise. */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener(state => setIsOnline(state.isConnected !== false && state.isInternetReachable !== false)), []);
  return isOnline;
}
