import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSession, type UserSession } from '../utils/auth';
import { getMealDays, resetMealDay, saveMealDay } from '../utils/mealStore';
import type { MealDay, MealItem, MealType } from '../types';

const MEAL_META: Record<MealType, { emoji: string; label: string; color: string; bg: string }> = {
  breakfast: { emoji: '🌅', label: '아침', color: '#F59E0B', bg: '#FFFBEB' },
  lunch: { emoji: '☀️', label: '점심', color: '#10B981', bg: '#ECFDF5' },
  dinner: { emoji: '🌙', label: '저녁', color: '#6366F1', bg: '#EEF2FF' },
  snack: { emoji: '🍪', label: '간식', color: '#EC4899', bg: '#FDF2F8' },
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const EMPTY_FORM: MealItem = {
  type: 'lunch',
  time: '',
  title: '',
  menu: '',
  place: '',
  note: '',
};

type ScreenTab = 'view' | 'edit';

export default function MealScreen() {
  const [screenTab, setScreenTab] = useState<ScreenTab>('view');
  const [mealDays, setMealDays] = useState<MealDay[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMeals, setEditMeals] = useState<MealItem[]>([]);
  const [form, setForm] = useState<MealItem>(EMPTY_FORM);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  const selectedDay = mealDays[selectedIndex];

  const loadMeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const [days, currentSession] = await Promise.all([getMealDays(), getSession()]);
      setMealDays(days);
      setSession(currentSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals]),
  );

  useEffect(() => {
    if (selectedDay) {
      setEditMeals(selectedDay.meals.map((meal) => ({ ...meal })));
      setForm(EMPTY_FORM);
      setEditingIndex(null);
      setFormError('');
    }
  }, [selectedDay?.day, selectedDay?.updatedAt]);

  const handleSaveDay = async () => {
    if (!session) {
      Alert.alert('로그인 필요', '로그인 후 식사 메뉴를 수정할 수 있어요.');
      return;
    }

    setIsSaving(true);
    try {
      await saveMealDay({
        day: selectedDay.day,
        meals: editMeals,
        authorId: session.id,
        authorName: session.name,
      });
      await loadMeals();
      setScreenTab('view');
      Alert.alert('저장 완료', '식사 메뉴가 업데이트되었어요.');
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '저장에 실패했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDay = () => {
    Alert.alert('기본값 복원', '이 날짜 메뉴를 기본값으로 되돌릴까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '복원',
        style: 'destructive',
        onPress: async () => {
          try {
            const restored = await resetMealDay(selectedDay.day);
            setEditMeals(restored.meals.map((meal) => ({ ...meal })));
            await loadMeals();
            Alert.alert('복원 완료', '기본 메뉴로 되돌렸어요.');
          } catch (error) {
            Alert.alert('오류', error instanceof Error ? error.message : '복원에 실패했어요.');
          }
        },
      },
    ]);
  };

  const handleAddOrUpdateForm = () => {
    setFormError('');

    if (!form.time.trim() || !form.title.trim() || !form.menu.trim()) {
      setFormError('시간, 제목, 메뉴는 필수 입력 항목이에요.');
      return;
    }

    const nextMeal: MealItem = {
      type: form.type,
      time: form.time.trim(),
      title: form.title.trim(),
      menu: form.menu.trim(),
      place: form.place.trim(),
      note: form.note.trim(),
    };

    if (editingIndex !== null) {
      setEditMeals((prev) => prev.map((meal, index) => (index === editingIndex ? nextMeal : meal)));
    } else {
      setEditMeals((prev) => [...prev, nextMeal]);
    }

    setForm(EMPTY_FORM);
    setEditingIndex(null);
  };

  const handleEditMeal = (index: number) => {
    setForm({ ...editMeals[index] });
    setEditingIndex(index);
    setFormError('');
  };

  const handleDeleteMeal = (index: number) => {
    Alert.alert('메뉴 삭제', '이 식사 메뉴를 목록에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setEditMeals((prev) => prev.filter((_, i) => i !== index));
          if (editingIndex === index) {
            setForm(EMPTY_FORM);
            setEditingIndex(null);
          }
        },
      },
    ]);
  };

  if (isLoading && mealDays.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screenTabBar}>
        <TouchableOpacity
          style={[styles.screenTab, screenTab === 'view' && styles.screenTabActive]}
          onPress={() => setScreenTab('view')}
        >
          <Text style={[styles.screenTabText, screenTab === 'view' && styles.screenTabTextActive]}>
            메뉴 보기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.screenTab, screenTab === 'edit' && styles.screenTabActive]}
          onPress={() => setScreenTab('edit')}
        >
          <Text style={[styles.screenTabText, screenTab === 'edit' && styles.screenTabTextActive]}>
            수정 · 올리기 ✏️
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabs}
      >
        {mealDays.map((day, index) => (
          <TouchableOpacity
            key={day.day}
            style={[styles.dayTab, selectedIndex === index && styles.dayTabActive]}
            onPress={() => setSelectedIndex(index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayTabLabel, selectedIndex === index && styles.dayTabLabelActive]}>
              {day.label}
            </Text>
            <Text style={[styles.dayTabDate, selectedIndex === index && styles.dayTabDateActive]}>
              {day.date}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {screenTab === 'view' ? (
        <FlatList
          data={selectedDay?.meals ?? []}
          keyExtractor={(item, index) => `${selectedDay?.day}-${item.type}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            selectedDay ? (
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{selectedDay.label}</Text>
                <Text style={styles.daySubtitle}>
                  {selectedDay.date} · 식사 {selectedDay.meals.length}회
                </Text>
                {selectedDay.isCustomized ? (
                  <Text style={styles.customizedMeta}>
                    ✏️ {selectedDay.updatedByName}님이 수정함
                  </Text>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>이 날 등록된 식사 메뉴가 없어요</Text>
            </View>
          }
          renderItem={({ item }) => <MealCard item={item} />}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.editHint}>
            {session?.name ?? '팀원'}님, 선택한 날짜의 식사 메뉴를 수정하거나 새로 올릴 수 있어요.
          </Text>

          <Text style={styles.sectionTitle}>현재 메뉴 ({editMeals.length})</Text>
          {editMeals.length === 0 ? (
            <Text style={styles.emptyEditText}>아직 등록된 메뉴가 없어요. 아래에서 추가해주세요.</Text>
          ) : (
            editMeals.map((meal, index) => (
              <View key={`${meal.type}-${meal.time}-${index}`} style={styles.editRow}>
                <View style={styles.editRowBody}>
                  <Text style={styles.editRowTitle}>
                    {MEAL_META[meal.type].emoji} {meal.time} · {meal.title}
                  </Text>
                  <Text style={styles.editRowMenu} numberOfLines={2}>
                    {meal.menu}
                  </Text>
                </View>
                <View style={styles.editRowActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => handleEditMeal(index)}>
                    <Text style={styles.smallButtonText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.smallButtonDanger]}
                    onPress={() => handleDeleteMeal(index)}
                  >
                    <Text style={[styles.smallButtonText, styles.smallButtonDangerText]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>
            {editingIndex !== null ? '메뉴 수정' : '새 메뉴 추가'}
          </Text>

          <Text style={styles.inputLabel}>식사 구분</Text>
          <View style={styles.typeRow}>
            {MEAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, form.type === type && styles.typeChipActive]}
                onPress={() => setForm((prev) => ({ ...prev, type }))}
              >
                <Text style={[styles.typeChipText, form.type === type && styles.typeChipTextActive]}>
                  {MEAL_META[type].emoji} {MEAL_META[type].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>시간</Text>
          <TextInput
            style={styles.input}
            value={form.time}
            onChangeText={(time) => setForm((prev) => ({ ...prev, time }))}
            placeholder="예) 12:30"
            placeholderTextColor="#A1A1AA"
          />

          <Text style={styles.inputLabel}>제목</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
            placeholder="예) 점심 식사"
            placeholderTextColor="#A1A1AA"
          />

          <Text style={styles.inputLabel}>메뉴</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.menu}
            onChangeText={(menu) => setForm((prev) => ({ ...prev, menu }))}
            placeholder="메뉴 내용을 입력하세요"
            placeholderTextColor="#A1A1AA"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.inputLabel}>장소</Text>
          <TextInput
            style={styles.input}
            value={form.place}
            onChangeText={(place) => setForm((prev) => ({ ...prev, place }))}
            placeholder="예) 숙소 식당"
            placeholderTextColor="#A1A1AA"
          />

          <Text style={styles.inputLabel}>참고 사항</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.note}
            onChangeText={(note) => setForm((prev) => ({ ...prev, note }))}
            placeholder="알레르기, 준비물 등"
            placeholderTextColor="#A1A1AA"
            multiline
            textAlignVertical="top"
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <TouchableOpacity style={styles.addButton} onPress={handleAddOrUpdateForm}>
            <Text style={styles.addButtonText}>
              {editingIndex !== null ? '수정 내용 반영' : '목록에 추가'}
            </Text>
          </TouchableOpacity>

          {editingIndex !== null ? (
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={() => {
                setForm(EMPTY_FORM);
                setEditingIndex(null);
                setFormError('');
              }}
            >
              <Text style={styles.cancelEditText}>수정 취소</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveDay}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>이 날짜 메뉴 저장하기</Text>
            )}
          </TouchableOpacity>

          {selectedDay?.isCustomized ? (
            <TouchableOpacity style={styles.resetButton} onPress={handleResetDay}>
              <Text style={styles.resetButtonText}>기본 메뉴로 되돌리기</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function MealCard({ item }: { item: MealItem }) {
  const meta = MEAL_META[item.type];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
          <Text style={styles.typeEmoji}>{meta.emoji}</Text>
          <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>

      <View style={styles.menuBox}>
        <Text style={styles.menuLabel}>메뉴</Text>
        <Text style={styles.menuText}>{item.menu}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>장소</Text>
        <Text style={styles.infoValue}>{item.place || '-'}</Text>
      </View>

      {item.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>💡 {item.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  screenTabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 4,
  },
  screenTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  screenTabActive: {
    backgroundColor: '#FFFFFF',
  },
  screenTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  screenTabTextActive: {
    color: '#059669',
  },
  dayTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 100,
    alignItems: 'center',
  },
  dayTabActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  dayTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dayTabLabelActive: {
    color: '#FFFFFF',
  },
  dayTabDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  dayTabDateActive: {
    color: '#D1FAE5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dayHeader: {
    marginBottom: 16,
    paddingTop: 4,
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  daySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  customizedMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginTop: 6,
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeEmoji: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  menuBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    width: 36,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  noteBox: {
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
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
  editContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  editHint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 8,
  },
  emptyEditText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editRowBody: {
    flex: 1,
    paddingRight: 8,
  },
  editRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  editRowMenu: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  editRowActions: {
    gap: 6,
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  smallButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  smallButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  smallButtonDangerText: {
    color: '#DC2626',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  multilineInput: {
    minHeight: 80,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  typeChipTextActive: {
    color: '#059669',
  },
  formError: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelEditButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
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
