import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getUnreadCount } from '../utils/notifications';
import NotificationModal from '../components/NotificationModal';

interface NotificationContextValue {
  unreadCount: number;
  openNotifications: () => void;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const openNotifications = useCallback(() => {
    setModalVisible(true);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      openNotifications,
      refreshUnreadCount,
    }),
    [unreadCount, openNotifications, refreshUnreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          refreshUnreadCount();
        }}
        onUnreadChange={setUnreadCount}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
