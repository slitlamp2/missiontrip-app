import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearSession, getSession } from '../utils/auth';
import { useNotifications } from '../context/NotificationContext';
import NotificationBellButton from './NotificationBellButton';
import { theme } from '../constants/theme';

interface AppHeaderProps {
  title: string;
  onLogout: () => void;
  onGoHome?: () => void;
}

const HEADER_CONTENT_HEIGHT = 58;
const CAMERA_CLEARANCE = 10;

export default function AppHeader({ title, onLogout, onGoHome }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount, openNotifications, refreshUnreadCount } = useNotifications();
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      setUserName(session?.name ?? null);
    });
    refreshUnreadCount();
  }, [title, refreshUnreadCount]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '다른 계정으로 다시 로그인할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await clearSession();
            onLogout();
          } catch {
            Alert.alert('오류', '로그아웃에 실패했어요. 다시 시도해주세요.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + CAMERA_CLEARANCE }]}>
      <View style={styles.row}>
        <View style={styles.leftSlot}>
          {onGoHome ? (
            <TouchableOpacity style={styles.homeButton} onPress={onGoHome} activeOpacity={0.7}>
              <Text style={styles.homeButtonText}>🏠</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.title, onGoHome && styles.titleWithHome]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.centerSlot}>
          <NotificationBellButton unreadCount={unreadCount} onPress={openNotifications} />
        </View>

        <View style={styles.rightSlot}>
          {userName ? (
            <View style={styles.nameChip}>
              <Text style={styles.nameText} numberOfLines={1}>
                {userName}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.danger} />
            ) : (
              <Text style={styles.logoutText}>로그아웃</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const HEADER_HEIGHT = Platform.OS === 'ios' ? HEADER_CONTENT_HEIGHT : HEADER_CONTENT_HEIGHT + 4;

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: HEADER_CONTENT_HEIGHT,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  leftSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    paddingRight: 4,
    gap: 10,
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    fontSize: 20,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
  titleWithHome: {
    fontSize: 15,
  },
  centerSlot: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  rightSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingBottom: 6,
  },
  nameChip: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 72,
  },
  nameText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  logoutButton: {
    backgroundColor: theme.colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    minWidth: 64,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.danger,
    letterSpacing: -0.3,
  },
});

export { HEADER_HEIGHT, HEADER_CONTENT_HEIGHT, CAMERA_CLEARANCE };
