import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import type { AppNotification } from '../types';
import { getSession, type UserSession } from '../utils/auth';
import {
  createMemberNotification,
  deleteMemberNotification,
  getNotificationsWithReadState,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../utils/notifications';
import FormattedText from './FormattedText';
import { theme } from '../constants/theme';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}

type TabKey = 'inbox' | 'compose';

function formatDate(date: string, time?: string): string {
  const [, month, day] = date.split('-');
  const base = `${Number(month)}월 ${Number(day)}일`;
  return time ? `${base} · ${time}` : base;
}

function getTypeLabel(type: AppNotification['type']): string {
  if (type === 'member') return '팀원';
  if (type === 'schedule') return '일정';
  return '공지';
}

function NotificationRow({
  item,
  isRead,
  canDelete,
  onPress,
  onDelete,
}: {
  item: AppNotification;
  isRead: boolean;
  canDelete: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const typeLabel = getTypeLabel(item.type);

  return (
    <TouchableOpacity
      style={[styles.row, !isRead && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.rowTop}>
        <View
          style={[
            styles.badge,
            item.type === 'member' && styles.badgeMember,
            item.type === 'notice' && styles.badgeNotice,
            item.type === 'schedule' && styles.badgeSchedule,
          ]}
        >
          <Text style={styles.badgeText}>{typeLabel}</Text>
        </View>
        {!isRead ? <View style={styles.unreadDot} /> : null}
        {item.priority === 'high' ? (
          <View style={styles.priorityChip}>
            <Text style={styles.priorityText}>중요</Text>
          </View>
        ) : null}
        {canDelete ? (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteText}>삭제</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.rowTitle, !isRead && styles.rowTitleUnread]}>{item.title}</Text>
      <FormattedText style={styles.rowBody} numberOfLines={4}>
        {item.body}
      </FormattedText>
      <Text style={styles.rowMeta}>
        {item.authorName ? `${item.authorName} · ` : ''}
        {item.dayLabel ? `${item.dayLabel} · ` : ''}
        {formatDate(item.date, item.time)}
      </Text>
    </TouchableOpacity>
  );
}

export default function NotificationModal({ visible, onClose, onUnreadChange }: NotificationModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('inbox');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composePriority, setComposePriority] = useState<'high' | 'normal'>('normal');
  const [composeError, setComposeError] = useState('');

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, currentSession] = await Promise.all([getNotificationsWithReadState(), getSession()]);
      setNotifications(result.notifications);
      setReadIds(result.readIds);
      setSession(currentSession);
      onUnreadChange(result.unreadCount);
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    } else {
      setActiveTab('inbox');
      setComposeTitle('');
      setComposeBody('');
      setComposePriority('normal');
      setComposeError('');
    }
  }, [visible, loadNotifications]);

  const handlePressItem = async (item: AppNotification) => {
    const nextReadIds = readIds.includes(item.id) ? readIds : [...readIds, item.id];
    await markNotificationAsRead(item.id);
    setReadIds(nextReadIds);
    onUnreadChange(notifications.filter((n) => !nextReadIds.includes(n.id)).length);
  };

  const handleMarkAllRead = async () => {
    const ids = notifications.map((item) => item.id);
    await markAllNotificationsAsRead(ids);
    setReadIds(ids);
    onUnreadChange(0);
  };

  const handleDelete = (item: AppNotification) => {
    if (!session || item.type !== 'member') return;

    Alert.alert('알림 삭제', '이 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMemberNotification(item.id, session.id);
            await loadNotifications();
          } catch (error) {
            Alert.alert('오류', error instanceof Error ? error.message : '삭제에 실패했어요.');
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    setComposeError('');

    if (!session) {
      setComposeError('로그인 후 알림을 올릴 수 있어요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createMemberNotification({
        authorId: session.id,
        authorName: session.name,
        title: composeTitle,
        body: composeBody,
        priority: composePriority,
      });

      await markNotificationAsRead(created.id);

      setComposeTitle('');
      setComposeBody('');
      setComposePriority('normal');
      setActiveTab('inbox');
      await loadNotifications();
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : '알림 등록에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>알림 🔔</Text>
                <Text style={styles.subtitle}>
                  {activeTab === 'inbox'
                    ? unreadCount > 0
                      ? `읽지 않은 알림 ${unreadCount}개`
                      : '모든 알림을 확인했어요'
                    : `${session?.name ?? '팀원'}님, 알림을 올려보세요`}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
                onPress={() => setActiveTab('inbox')}
              >
                <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>알림함</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'compose' && styles.tabActive]}
                onPress={() => setActiveTab('compose')}
              >
                <Text style={[styles.tabText, activeTab === 'compose' && styles.tabTextActive]}>올리기 ✏️</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'inbox' ? (
              <>
                {unreadCount > 0 ? (
                  <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
                    <Text style={styles.markAllText}>모두 읽음 처리</Text>
                  </TouchableOpacity>
                ) : null}

                {isLoading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color="#6366F1" />
                  </View>
                ) : (
                  <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyTitle}>새 알림이 없어요</Text>
                        <Text style={styles.emptyBody}>「올리기」 탭에서 팀원 알림을 작성할 수 있어요</Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <NotificationRow
                        item={item}
                        isRead={readIds.includes(item.id)}
                        canDelete={item.type === 'member' && item.authorId === session?.id}
                        onPress={() => handlePressItem(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    )}
                  />
                )}
              </>
            ) : (
              <ScrollView contentContainerStyle={styles.composeContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.composeHint}>모든 팀원이 알림을 올릴 수 있어요. 제목과 내용을 입력해주세요.</Text>

                <Text style={styles.inputLabel}>제목</Text>
                <TextInput
                  style={styles.input}
                  value={composeTitle}
                  onChangeText={(text) => {
                    setComposeError('');
                    setComposeTitle(text);
                  }}
                  placeholder="예) 내일 집합 시간 변경"
                  placeholderTextColor="#A1A1AA"
                  maxLength={60}
                />

                <Text style={styles.inputLabel}>내용</Text>
                <TextInput
                  style={[styles.input, styles.bodyInput]}
                  value={composeBody}
                  onChangeText={(text) => {
                    setComposeError('');
                    setComposeBody(text);
                  }}
                  placeholder="팀원에게 전달할 내용을 적어주세요"
                  placeholderTextColor="#A1A1AA"
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />

                <Text style={styles.inputLabel}>중요도</Text>
                <View style={styles.priorityRow}>
                  <TouchableOpacity
                    style={[styles.priorityChipButton, composePriority === 'normal' && styles.priorityChipButtonActive]}
                    onPress={() => setComposePriority('normal')}
                  >
                    <Text
                      style={[
                        styles.priorityChipButtonText,
                        composePriority === 'normal' && styles.priorityChipButtonTextActive,
                      ]}
                    >
                      일반
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.priorityChipButton, composePriority === 'high' && styles.priorityChipButtonHigh]}
                    onPress={() => setComposePriority('high')}
                  >
                    <Text
                      style={[
                        styles.priorityChipButtonText,
                        composePriority === 'high' && styles.priorityChipButtonTextActive,
                      ]}
                    >
                      중요 ⭐
                    </Text>
                  </TouchableOpacity>
                </View>

                {composeError ? <Text style={styles.composeError}>{composeError}</Text> : null}

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>알림 올리기</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D8',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F4F4F5',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  markAllButton: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366F1',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F4F4F5',
  },
  rowUnread: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeNotice: {
    backgroundColor: '#FCE7F3',
  },
  badgeSchedule: {
    backgroundColor: '#FFEDD5',
  },
  badgeMember: {
    backgroundColor: '#E0E7FF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  priorityChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  deleteButton: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  deleteText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  rowTitleUnread: {
    fontWeight: '800',
  },
  rowBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: 8,
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  composeContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  composeHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  bodyInput: {
    minHeight: 120,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityChipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  priorityChipButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#818CF8',
  },
  priorityChipButtonHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  priorityChipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  priorityChipButtonTextActive: {
    color: theme.colors.text,
  },
  composeError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
