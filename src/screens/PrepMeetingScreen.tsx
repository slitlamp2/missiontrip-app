import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import StackScreenHeader from '../components/StackScreenHeader';
import ScreenTabBar, { type TabKey } from '../components/ScreenTabBar';
import { getSession, type UserSession } from '../utils/auth';
import {
  getDefaultSectionContent,
  getSectionContent,
  resetSectionContent,
  saveSectionContent,
} from '../utils/sectionContent';
import type { SectionContentKey } from '../types';

type PrepTab = 'all' | 'group';

const PREP_SECTION_KEYS: Record<PrepTab, SectionContentKey> = {
  all: 'prepMeetingAll',
  group: 'prepMeetingGroup',
};

export default function PrepMeetingScreen() {
  const navigation = useNavigation();
  const [screenTab, setScreenTab] = useState<TabKey>('view');
  const [prepTab, setPrepTab] = useState<PrepTab>('all');
  const [content, setContent] = useState('');
  const [editBody, setEditBody] = useState('');
  const [meta, setMeta] = useState<{ updatedByName?: string; isCustomized?: boolean }>({});
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const sectionKey = PREP_SECTION_KEYS[prepTab];

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, currentSession] = await Promise.all([getSectionContent(sectionKey), getSession()]);
      setContent(data.body);
      setEditBody(data.body);
      setMeta({ updatedByName: data.updatedByName, isCustomized: data.isCustomized });
      setSession(currentSession);
    } finally {
      setIsLoading(false);
    }
  }, [sectionKey]);

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [loadContent]),
  );

  useEffect(() => {
    if (screenTab === 'edit') {
      setEditBody(content);
      setFormError('');
    }
  }, [screenTab, content]);

  const handleSave = async () => {
    if (!session) {
      Alert.alert('로그인 필요', '로그인 후 내용을 수정할 수 있어요.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveSectionContent({
        key: sectionKey,
        body: editBody,
        authorId: session.id,
        authorName: session.name,
      });
      setContent(saved.body);
      setMeta({ updatedByName: saved.updatedByName, isCustomized: saved.isCustomized });
      setScreenTab('view');
      Alert.alert('저장 완료', '내용이 업데이트되었어요.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '저장에 실패했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('기본값 복원', '기본 내용으로 되돌릴까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '복원',
        style: 'destructive',
        onPress: async () => {
          try {
            const restored = await resetSectionContent(sectionKey);
            setContent(restored.body);
            setEditBody(restored.body);
            setMeta({ isCustomized: false });
            Alert.alert('복원 완료', '기본 내용으로 되돌렸어요.');
          } catch (error) {
            Alert.alert('오류', error instanceof Error ? error.message : '복원에 실패했어요.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackScreenHeader title="준비모임 🤝" onBack={() => navigation.goBack()} />

      <ScreenTabBar
        activeTab={screenTab}
        onChange={setScreenTab}
        backgroundColor="#FFF7ED"
        activeColor="#EA580C"
      />

      <View style={styles.prepTabBar}>
        <TouchableOpacity
          style={[styles.prepTab, prepTab === 'all' && styles.prepTabActive]}
          onPress={() => setPrepTab('all')}
        >
          <Text style={[styles.prepTabText, prepTab === 'all' && styles.prepTabTextActive]}>전체</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.prepTab, prepTab === 'group' && styles.prepTabActive]}
          onPress={() => setPrepTab('group')}
        >
          <Text style={[styles.prepTabText, prepTab === 'group' && styles.prepTabTextActive]}>조별</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#EA580C" size="large" />
        </View>
      ) : screenTab === 'view' ? (
        <ScrollView contentContainerStyle={styles.viewContent}>
          {meta.isCustomized && meta.updatedByName ? (
            <Text style={styles.metaText}>✏️ {meta.updatedByName}님이 수정함</Text>
          ) : null}
          <Text style={styles.bodyText}>{content}</Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.editHint}>
            {prepTab === 'all' ? '전체' : '조별'} 준비모임 내용을 {session?.name ?? '팀원'}님이 수정하거나 올릴 수 있어요.
          </Text>
          <TextInput
            style={styles.input}
            value={editBody}
            onChangeText={(text) => {
              setFormError('');
              setEditBody(text);
            }}
            multiline
            textAlignVertical="top"
            placeholder="내용을 입력하세요"
            placeholderTextColor="#A1A1AA"
          />
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>내용 저장하기</Text>
            )}
          </TouchableOpacity>
          {meta.isCustomized ? (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>기본 내용으로 되돌리기</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setEditBody(getDefaultSectionContent(sectionKey))}
            >
              <Text style={styles.resetButtonText}>기본 내용 불러오기</Text>
            </TouchableOpacity>
          )}
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
  prepTabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFEDD5',
    borderRadius: 12,
    padding: 3,
  },
  prepTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  prepTabActive: {
    backgroundColor: '#FFFFFF',
  },
  prepTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78716C',
  },
  prepTabTextActive: {
    color: '#EA580C',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  editContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  editHint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    minHeight: 260,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 12,
  },
  formError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resetButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
