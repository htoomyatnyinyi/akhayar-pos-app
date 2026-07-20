import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useAppDispatch } from "./redux-hooks/useAppDispatch";
import { setOnlineStatus } from "@/services/features/sync/syncSlice";

export function useNetworkStatus() {
  const dispatch = useAppDispatch();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      dispatch(setOnlineStatus(online));
    });
    return () => unsubscribe();
  }, [dispatch]);

  return isOnline;
}

/*
import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useAppDispatch } from "../store/hooks";
import { setOnlineStatus } from "../store/slices/syncSlice";

export function useNetworkStatus() {
  const dispatch = useAppDispatch();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
      dispatch(setOnlineStatus(online));
    });
    return () => unsubscribe();
  }, [dispatch]);

  return isOnline;
}
*/
