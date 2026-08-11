import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import StackScreenHeader from '../components/StackScreenHeader';
import {
  signInSettlementWithEmail,
  signOutSettlementAuth,
  subscribeSettlementAuth,
} from '../lib/settlementAuth';
import {
  createSettlementEntry,
  deleteSettlementEntry,
  formatMoney,
  subscribeSettlementEntries,
  summarizeSettlementByCurrency,
} from '../lib/settlementService';
import { canAccessSettlement, getSession, type UserSession } from '../utils/auth';
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
} from '../utils/mediaPermissions';
import {
  SETTLEMENT_CATEGORIES,
  SETTLEMENT_CURRENCIES,
  type SettlementCurrency,
  type SettlementEntry,
} from '../types/settlement';

type FormType = 'expense' | 'income';

export default function SettlementScreen() {
  const navigation = useNavigation();
  const [session, setSession] = useState<UserSession | null | undefined>(undefined);
  const [authReady, setAuthReady] = useState(false);
  const [settlementUserEmail, setSettlementUserEmail] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [entries, setEntries] = useState<SettlementEntry[]>([]);
  const [listError, setListError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<FormType>('expense');
  const [currency, setCurrency] = useState<SettlementCurrency>('KRW');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<string>(SETTLEMENT_CATEGORIES[0]);
  const [cardLabel, setCardLabel] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<number | undefined>();
  const [receiptHeight, setReceiptHeight] = useState<number | undefined>();

  useEffect(() => {
    void getSession().then(setSession);
  }, []);

  useEffect(() => {
    const unsub = subscribeSettlementAuth((user) => {
      setSettlementUserEmail(user?.email ?? null);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!settlementUserEmail) {
      setEntries([]);
      return;
    }

    const unsub = subscribeSettlementEntries(
      setEntries,
      (error) => setListError(error.message),
    );
    return unsub;
  }, [settlementUserEmail]);

  const summaries = useMemo(() => summarizeSettlementByCurrency(entries), [entries]);
  const allowed = canAccessSettlement(session);

  const handleSettlementLogin = async () => {
    setLoginError('');
    if (!email.trim() || !password) {
      setLoginError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoginLoading(true);
    try {
      await signInSettlementWithEmail(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      setLoginError(message.includes('auth/') ? '이메일 또는 비밀번호를 확인해 주세요.' : message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSettlementLogout = () => {
    Alert.alert('정산 로그아웃', '정산 계정에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void signOutSettlementAuth();
        },
      },
    ]);
  };

  const resetForm = () => {
    setType('expense');
    setCurrency('KRW');
    setAmountText('');
    setCategory(SETTLEMENT_CATEGORIES[0]);
    setCardLabel('');
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
    setReceiptUri(null);
    setReceiptWidth(undefined);
    setReceiptHeight(undefined);
  };

  const pickReceipt = async () => {
    const granted = await ensureMediaLibraryPermission();
    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    setReceiptUri(asset.uri);
    setReceiptWidth(asset.width);
    setReceiptHeight(asset.height);
  };

  const takeReceipt = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    setReceiptUri(asset.uri);
    setReceiptWidth(asset.width);
    setReceiptHeight(asset.height);
  };

  const handleSave = async () => {
    if (!session) {
      Alert.alert('오류', '앱 로그인 정보를 확인할 수 없습니다.');
      return;
    }
    if (!receiptUri) {
      Alert.alert('영수증 필요', '영수증 사진을 첨부해 주세요.');
      return;
    }
    const amount = Number(amountText.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('금액 확인', '올바른 금액을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      await createSettlementEntry({
        type,
        amount,
        currency,
        category,
        note,
        cardLabel,
        date,
        receiptUri,
        receiptWidth,
        receiptHeight,
        createdBy: { id: session.id, name: session.name },
      });
      setFormVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback((entry: SettlementEntry) => {
    Alert.alert(
      '내역 삭제',
      `${formatMoney(entry.amount, entry.currency)} 내역을 삭제할까요?`,
      [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deleteSettlementEntry(entry).catch((error: unknown) => {
            Alert.alert(
              '삭제 실패',
              error instanceof Error ? error.message : '다시 시도해 주세요.',
            );
          });
        },
      },
    ],
    );
  }, []);

  if (!authReady || session === undefined) {
    return (
      <View style={styles.container}>
        <StackScreenHeader title="정산 💰" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator color="#0F766E" />
        </View>
      </View>
    );
  }

  if (!session || !allowed) {
    return (
      <View style={styles.container}>
        <StackScreenHeader title="정산 💰" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.blockedTitle}>접근 권한이 없습니다</Text>
          <Text style={styles.blockedBody}>정산은 허가된 담당자만 사용할 수 있습니다.</Text>
        </View>
      </View>
    );
  }

  if (!settlementUserEmail) {
    return (
      <View style={styles.container}>
        <StackScreenHeader title="정산 💰" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.loginTitle}>정산 계정 로그인</Text>
          <Text style={styles.loginHint}>
            Firebase Email/Password 계정으로 로그인하면 여러 기기에서 영수증·금액이 함께 합산됩니다.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void handleSettlementLogin()}
            disabled={loginLoading}
          >
            {loginLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>정산 로그인</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StackScreenHeader title="정산 💰" onBack={() => navigation.goBack()} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryEmail}>{settlementUserEmail}</Text>
        {summaries.length === 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>수입</Text>
              <Text style={[styles.summaryValue, styles.income]}>0원</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>지출</Text>
              <Text style={[styles.summaryValue, styles.expense]}>0원</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>잔액</Text>
              <Text style={styles.summaryValue}>0원</Text>
            </View>
          </View>
        ) : (
          summaries.map((summary) => {
            const label =
              SETTLEMENT_CURRENCIES.find((item) => item.code === summary.currency)?.label ??
              summary.currency;
            return (
              <View key={summary.currency} style={styles.currencySummaryBlock}>
                <Text style={styles.currencySummaryTitle}>{label}</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>수입</Text>
                    <Text style={[styles.summaryValue, styles.income]}>
                      {formatMoney(summary.income, summary.currency)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>지출</Text>
                    <Text style={[styles.summaryValue, styles.expense]}>
                      {formatMoney(summary.expense, summary.currency)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>잔액</Text>
                    <Text style={styles.summaryValue}>
                      {formatMoney(summary.balance, summary.currency)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={styles.summaryActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.actionFlex]}
            onPress={handleSettlementLogout}
          >
            <Text style={styles.secondaryButtonText}>정산 로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.actionFlex]}
            onPress={() => {
              resetForm();
              setFormVisible(true);
            }}
          >
            <Text style={styles.primaryButtonText}>내역 추가</Text>
          </TouchableOpacity>
        </View>
      </View>

      {listError ? <Text style={styles.errorText}>{listError}</Text> : null}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>아직 등록된 정산 내역이 없습니다.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.entryCard}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.85}
          >
            <View style={styles.entryHeader}>
              <Text style={styles.entryCategory}>{item.category}</Text>
              <Text
                style={[
                  styles.entryAmount,
                  item.type === 'income' ? styles.income : styles.expense,
                ]}
              >
                {item.type === 'income' ? '+' : '-'}
                {formatMoney(item.amount, item.currency)}
              </Text>
            </View>
            <Text style={styles.entryMeta}>
              {item.date}
              {` · ${item.currency}`}
              {item.cardLabel ? ` · ${item.cardLabel}` : ''}
              {` · ${item.createdByName}`}
            </Text>
            {item.note ? <Text style={styles.entryNote}>{item.note}</Text> : null}
            {item.receiptUrl ? (
              <Image source={{ uri: item.receiptUrl }} style={styles.receiptThumb} />
            ) : null}
          </TouchableOpacity>
        )}
      />

      <Modal visible={formVisible} animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalContainer}>
          <StackScreenHeader title="내역 추가" onBack={() => setFormVisible(false)} />
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeChip, type === 'expense' && styles.typeChipActive]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeChipText, type === 'expense' && styles.typeChipTextActive]}>
                  지출
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, type === 'income' && styles.typeChipActive]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeChipText, type === 'income' && styles.typeChipTextActive]}>
                  수입
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>통화</Text>
            <View style={styles.typeRow}>
              {SETTLEMENT_CURRENCIES.map((option) => (
                <TouchableOpacity
                  key={option.code}
                  style={[styles.typeChip, currency === option.code && styles.typeChipActive]}
                  onPress={() => setCurrency(option.code)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      currency === option.code && styles.typeChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>금액</Text>
            <TextInput
              style={styles.input}
              placeholder={currency === 'USD' ? '0.00' : '0'}
              keyboardType={currency === 'USD' ? 'decimal-pad' : 'number-pad'}
              value={amountText}
              onChangeText={setAmountText}
            />

            <Text style={styles.label}>카테고리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {SETTLEMENT_CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.categoryChip, category === item && styles.categoryChipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === item && styles.categoryChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>카드/결제수단</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 팀 카드"
              value={cardLabel}
              onChangeText={setCardLabel}
            />

            <Text style={styles.label}>날짜 (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} />

            <Text style={styles.label}>메모</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="메모 (선택)"
              value={note}
              onChangeText={setNote}
              multiline
            />

            <Text style={styles.label}>영수증</Text>
            <View style={styles.receiptActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => void takeReceipt()}>
                <Text style={styles.secondaryButtonText}>촬영</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => void pickReceipt()}>
                <Text style={styles.secondaryButtonText}>앨범</Text>
              </TouchableOpacity>
            </View>
            {receiptUri ? (
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            ) : (
              <Text style={styles.loginHint}>영수증 사진은 필수입니다.</Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, styles.saveButton]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>저장</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  blockedBody: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  loginContent: {
    padding: 20,
    gap: 12,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  loginHint: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 12,
  },
  summaryEmail: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  currencySummaryBlock: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#99F6E4',
  },
  currencySummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  income: {
    color: '#2563EB',
  },
  expense: {
    color: '#DC2626',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionFlex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryCategory: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  entryMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  entryNote: {
    fontSize: 13,
    color: '#334155',
  },
  receiptThumb: {
    marginTop: 6,
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  formContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  typeChipText: {
    fontWeight: '700',
    color: '#64748B',
  },
  typeChipTextActive: {
    color: '#0F766E',
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  categoryRow: {
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  categoryChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#0F766E',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    marginTop: 12,
  },
});
