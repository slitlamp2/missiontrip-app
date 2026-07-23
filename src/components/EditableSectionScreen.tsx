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
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import StackScreenHeader from './StackScreenHeader';
import ScreenTabBar, { type TabKey } from './ScreenTabBar';
import FormattedText from './FormattedText';
import MongoliaMapLogo from './MongoliaMapLogo';
import ZoomableImage from './ZoomableImage';
import { getSession, type UserSession } from '../utils/auth';
import { hasMongoliaFlagEmoji, stripMongoliaFlagEmoji } from '../utils/mongoliaMapLogo';
import {
  getDefaultSectionContent,
  getSectionContent,
  resetSectionContent,
  saveSectionContent,
} from '../utils/sectionContent';
import type { SectionContentKey } from '../types';

interface EditableSectionScreenProps {
  headerTitle: string;
  sectionKey: SectionContentKey;
  tabBackgroundColor?: string;
  tabActiveColor?: string;
  showMapLogo?: boolean;
  /** 본문 텍스트 뒤에 붙일 이미지(예: 참가자 명단 PDF 페이지) */
  appendixImages?: readonly ImageSourcePropType[];
  appendixTitle?: string;
  appendixAspectRatio?: number;
}

export default function EditableSectionScreen({
  headerTitle,
  sectionKey,
  tabBackgroundColor,
  tabActiveColor,
  showMapLogo = false,
  appendixImages,
  appendixTitle,
  appendixAspectRatio = 1.414,
}: EditableSectionScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const [screenTab, setScreenTab] = useState<TabKey>('view');
  const [content, setContent] = useState('');
  const [editBody, setEditBody] = useState('');
  const [meta, setMeta] = useState<{ updatedByName?: string; isCustomized?: boolean }>({});
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

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

  const displayContent = stripMongoliaFlagEmoji(content);
  const shouldShowMapLogo = showMapLogo || hasMongoliaFlagEmoji(content);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackScreenHeader title={headerTitle} onBack={() => navigation.goBack()} />

      <ScreenTabBar
        activeTab={screenTab}
        onChange={setScreenTab}
        backgroundColor={tabBackgroundColor}
        activeColor={tabActiveColor}
      />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tabActiveColor ?? '#6366F1'} size="large" />
        </View>
      ) : screenTab === 'view' ? (
        <ScrollView contentContainerStyle={styles.viewContent}>
          {meta.isCustomized && meta.updatedByName ? (
            <Text style={styles.metaText}>✏️ {meta.updatedByName}님이 수정함</Text>
          ) : null}
          {shouldShowMapLogo ? (
            <View style={styles.mapLogoWrap}>
              <MongoliaMapLogo size={52} />
            </View>
          ) : null}
          <FormattedText style={styles.bodyText}>{displayContent}</FormattedText>
          {appendixImages && appendixImages.length > 0 ? (
            <View style={styles.appendix}>
              {appendixTitle ? <Text style={styles.appendixTitle}>{appendixTitle}</Text> : null}
              {appendixImages.map((source, index) => {
                const imageWidth = screenWidth - 40;
                return (
                  <ZoomableImage
                    key={`appendix-${index}`}
                    source={source}
                    horizontalInset={40}
                    style={{
                      width: imageWidth,
                      height: imageWidth * appendixAspectRatio,
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  />
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.editHint}>
            {session?.name ?? '팀원'}님, 내용을 수정하거나 새로 올릴 수 있어요.
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
            style={[styles.saveButton, { backgroundColor: tabActiveColor ?? '#6366F1' }, isSaving && styles.saveButtonDisabled]}
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
  mapLogoWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  appendix: {
    marginTop: 28,
    gap: 16,
  },
  appendixTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
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
