import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import StackScreenHeader from '../components/StackScreenHeader';
import ScreenTabBar, { type TabKey } from '../components/ScreenTabBar';
import { getSession, type UserSession } from '../utils/auth';
import {
  buildNotifications,
  createMemberNotification,
  deleteMemberNotification,
} from '../utils/notifications';
import type { AppNotification } from '../types';

function formatDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function NoticeCard({
  item,
  canDelete,
  onDelete,
}: {
  item: AppNotification;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const isMember = item.type === 'member';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, isMember ? styles.badgeMember : styles.badgeNotice]}>
          <Text style={styles.badgeText}>{isMember ? '팀원' : '공지'}</Text>
        </View>
        {item.priority === 'high' ? (
          <View style={styles.priorityChip}>
            <Text style={styles.priorityText}>중요</Text>
          </View>
        ) : null}
        {canDelete ? (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteText}>삭제</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardBody}>{item.body}</Text>
      <Text style={styles.cardMeta}>
        {item.authorName ? `${item.authorName} · ` : ''}
        {formatDate(item.date)}
        {item.time ? ` · ${item.time}` : ''}
      </Text>
    </View>
  );
}

export default function AnnouncementsScreen() {
  const navigation = useNavigation();
  const [screenTab, setScreenTab] = useState<TabKey>('view');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composePriority, setComposePriority] = useState<'high' | 'normal'>('normal');
  const [composeError, setComposeError] = useState('');

  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    try {
      const [all, currentSession] = await Promise.all([buildNotifications(), getSession()]);
      setItems(all.filter((item) => item.type === 'notice' || item.type === 'member'));
      setSession(currentSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotices();
    }, [loadNotices]),
  );

  const handleDelete = (item: AppNotification) => {
    if (!session) return;

    Alert.alert('삭제', '이 공지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMemberNotification(item.id, session.id);
            await loadNotices();
          } catch (error) {
            Alert.alert('오류', error instanceof Error ? error.message : '삭제에 실패했어요.');
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!session) {
      Alert.alert('로그인 필요', '로그인 후 공지를 올릴 수 있어요.');
      return;
    }

    setIsSubmitting(true);
    setComposeError('');
    try {
      await createMemberNotification({
        authorId: session.id,
        authorName: session.name,
        title: composeTitle,
        body: composeBody,
        priority: composePriority,
      });
      setComposeTitle('');
      setComposeBody('');
      setComposePriority('normal');
      setScreenTab('view');
      await loadNotices();
      Alert.alert('등록 완료', '공지가 올라갔어요.');
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : '등록에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackScreenHeader title="공지사항 📢" onBack={() => navigation.goBack()} />

      <ScreenTabBar
        activeTab={screenTab}
        onChange={setScreenTab}
        backgroundColor="#EEF2FF"
        activeColor="#6366F1"
        editLabel="올리기 ✏️"
      />

      {screenTab === 'view' ? (
        isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#6366F1" size="large" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.listHint}>팀 공지와 팀원 알림을 확인할 수 있어요.</Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>등록된 공지가 없어요</Text>
              </View>
            }
            renderItem={({ item }) => (
              <NoticeCard
                item={item}
                canDelete={item.type === 'member' && session?.id === item.authorId}
                onDelete={() => handleDelete(item)}
              />
            )}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.composeContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.composeHint}>
            {session?.name ?? '팀원'}님, 팀원들에게 공지를 올릴 수 있어요.
          </Text>

          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.titleInput}
            value={composeTitle}
            onChangeText={(text) => {
              setComposeError('');
              setComposeTitle(text);
            }}
            placeholder="공지 제목"
            placeholderTextColor="#A1A1AA"
          />

          <Text style={styles.label}>내용</Text>
          <TextInput
            style={styles.bodyInput}
            value={composeBody}
            onChangeText={(text) => {
              setComposeError('');
              setComposeBody(text);
            }}
            multiline
            textAlignVertical="top"
            placeholder="공지 내용을 입력하세요"
            placeholderTextColor="#A1A1AA"
          />

          <Text style={styles.label}>중요도</Text>
          <View style={styles.priorityRow}>
            <TouchableOpacity
              style={[styles.priorityButton, composePriority === 'normal' && styles.priorityButtonActive]}
              onPress={() => setComposePriority('normal')}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  composePriority === 'normal' && styles.priorityButtonTextActive,
                ]}
              >
                일반
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.priorityButton, composePriority === 'high' && styles.priorityButtonHigh]}
              onPress={() => setComposePriority('high')}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  composePriority === 'high' && styles.priorityButtonTextActive,
                ]}
              >
                중요
              </Text>
            </TouchableOpacity>
          </View>

          {composeError ? <Text style={styles.formError}>{composeError}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>공지 올리기</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listHint: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTop: {
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
    backgroundColor: '#EEF2FF',
  },
  badgeMember: {
    backgroundColor: '#FCE7F3',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
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
    paddingVertical: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  composeContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  composeHint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  bodyInput: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  priorityButtonHigh: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  priorityButtonTextActive: {
    color: '#0F172A',
  },
  formError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 10,
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
