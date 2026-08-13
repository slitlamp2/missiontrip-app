import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
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
  formatKrw,
  formatMoney,
  saveSettlementRates,
  subscribeSettlementEntries,
  subscribeSettlementRates,
} from '../lib/settlementService';
import { canAccessSettlement, getSession, type UserSession } from '../utils/auth';
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
} from '../utils/mediaPermissions';
import {
  buildExpenseSheetTsv,
  EXPENSE_SHEET_COLUMNS,
  mntPerThousandKrw,
  ratesFromForm,
  summarizeByBudgetItem,
  summarizeSettlementKrw,
  toKrwAmount,
} from '../utils/settlementExport';
import {
  DEFAULT_SETTLEMENT_RATES,
  SETTLEMENT_BUDGET_ITEMS,
  SETTLEMENT_FOREIGN_CURRENCIES,
  type SettlementEntry,
  type SettlementForeignCurrency,
  type SettlementRates,
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
  const [rates, setRates] = useState<SettlementRates>(DEFAULT_SETTLEMENT_RATES);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [ratesVisible, setRatesVisible] = useState(false);
  const [usdRateText, setUsdRateText] = useState(String(DEFAULT_SETTLEMENT_RATES.usdToKrw));
  const [mntThousandText, setMntThousandText] = useState(
    String(mntPerThousandKrw(DEFAULT_SETTLEMENT_RATES)),
  );
  const [savingRates, setSavingRates] = useState(false);

  const [type, setType] = useState<FormType>('expense');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<string>(SETTLEMENT_BUDGET_ITEMS[0]);
  const [vendor, setVendor] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<number | undefined>();
  const [receiptHeight, setReceiptHeight] = useState<number | undefined>();
  const [converterOpen, setConverterOpen] = useState(false);
  const [foreignCurrency, setForeignCurrency] = useState<SettlementForeignCurrency>('USD');
  const [foreignAmountText, setForeignAmountText] = useState('');

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

    const unsubEntries = subscribeSettlementEntries(setEntries, (error) =>
      setListError(error.message),
    );
    const unsubRates = subscribeSettlementRates(setRates);
    return () => {
      unsubEntries();
      unsubRates();
    };
  }, [settlementUserEmail]);

  const krwSummary = useMemo(() => summarizeSettlementKrw(entries, rates), [entries, rates]);
  const itemSummaries = useMemo(() => summarizeByBudgetItem(entries, rates), [entries, rates]);
  const exportTsv = useMemo(() => buildExpenseSheetTsv(entries, rates), [entries, rates]);
  const allowed = canAccessSettlement(session);

  const convertedForeignKrw = useMemo(() => {
    const amount = Number(foreignAmountText.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }
    return toKrwAmount(amount, foreignCurrency, rates);
  }, [foreignAmountText, foreignCurrency, rates]);

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
    setAmountText('');
    setCategory(SETTLEMENT_BUDGET_ITEMS[0]);
    setVendor('');
    setCardLabel('');
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
    setReceiptUri(null);
    setReceiptWidth(undefined);
    setReceiptHeight(undefined);
    setConverterOpen(false);
    setForeignCurrency('USD');
    setForeignAmountText('');
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
    if (!note.trim()) {
      Alert.alert('내용 필요', '엑셀 「내용」에 들어갈 설명을 입력해 주세요.');
      return;
    }
    if (!receiptUri) {
      Alert.alert('영수증 필요', '영수증 사진을 첨부해 주세요. 투그릭 원문은 사진에 남습니다.');
      return;
    }
    const amountKrw = Number(amountText.replace(/,/g, ''));
    if (!Number.isFinite(amountKrw) || amountKrw <= 0) {
      Alert.alert('금액 확인', '카드 영수증에 찍힌 원화를 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      await createSettlementEntry({
        type,
        amountKrw,
        category,
        note,
        vendor,
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
    const krw = toKrwAmount(entry.amount, entry.currency, rates);
    Alert.alert('내역 삭제', `${formatKrw(krw)} 내역을 삭제할까요?`, [
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
    ]);
  }, [rates]);

  const openRatesEditor = () => {
    setUsdRateText(String(rates.usdToKrw));
    setMntThousandText(String(mntPerThousandKrw(rates)));
    setRatesVisible(true);
  };

  const handleSaveRates = async () => {
    const next = ratesFromForm(
      Number(usdRateText.replace(/,/g, '')),
      Number(mntThousandText.replace(/,/g, '')),
    );
    if (!next) {
      Alert.alert('환율 확인', '0보다 큰 숫자를 입력해 주세요.');
      return;
    }
    setSavingRates(true);
    try {
      await saveSettlementRates(next);
      setRatesVisible(false);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
    } finally {
      setSavingRates(false);
    }
  };

  const handleShareTsv = async () => {
    if (!exportTsv) {
      Alert.alert('내역 없음', '내보낼 현지 지출이 없습니다.');
      return;
    }
    try {
      await Share.share({
        title: '지출내역',
        message: exportTsv,
      });
    } catch (error) {
      Alert.alert('공유 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };

  const applyConvertedAmount = () => {
    if (convertedForeignKrw <= 0) {
      Alert.alert('금액 확인', '외화 금액을 입력해 주세요.');
      return;
    }
    setAmountText(String(convertedForeignKrw));
    setConverterOpen(false);
  };

  const entryKrw = (entry: SettlementEntry) => toKrwAmount(entry.amount, entry.currency, rates);

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
        <Text style={styles.summaryScope}>현지 지출 · 엑셀 지출내역 붙여넣기</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>수입</Text>
            <Text style={[styles.summaryValue, styles.income]}>{formatKrw(krwSummary.income)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>지출</Text>
            <Text style={[styles.summaryValue, styles.expense]}>{formatKrw(krwSummary.expense)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>잔액</Text>
            <Text style={styles.summaryValue}>{formatKrw(krwSummary.balance)}</Text>
          </View>
        </View>

        {itemSummaries.length > 0 ? (
          <View style={styles.itemSummaryBlock}>
            {itemSummaries.map((item) => (
              <View key={item.item} style={styles.itemSummaryRow}>
                <Text style={styles.itemSummaryLabel}>{item.item}</Text>
                <Text style={styles.itemSummaryValue}>
                  {item.expense > 0 ? `지출 ${formatKrw(item.expense)}` : ''}
                  {item.expense > 0 && item.income > 0 ? ' · ' : ''}
                  {item.income > 0 ? `입금 ${formatKrw(item.income)}` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.rateChip} onPress={openRatesEditor}>
          <Text style={styles.rateChipText}>
            참고환율 1$={rates.usdToKrw.toLocaleString('ko-KR')}원 · 1,000₮=
            {mntPerThousandKrw(rates).toLocaleString('ko-KR')}원
          </Text>
          <Text style={styles.rateChipEdit}>수정</Text>
        </TouchableOpacity>

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
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setExportVisible(true)}
          disabled={entries.length === 0}
        >
          <Text style={styles.exportButtonText}>지출내역 엑셀용 복사</Text>
        </TouchableOpacity>
      </View>

      {listError ? <Text style={styles.errorText}>{listError}</Text> : null}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>아직 등록된 현지 지출이 없습니다.</Text>
        }
        renderItem={({ item }) => {
          const krw = entryKrw(item);
          const foreignNote =
            item.currency !== 'KRW'
              ? ` · 원문 ${formatMoney(item.amount, item.currency)}`
              : '';
          return (
            <TouchableOpacity
              style={styles.entryCard}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.85}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryCategory}>{item.note || item.category}</Text>
                <Text
                  style={[
                    styles.entryAmount,
                    item.type === 'income' ? styles.income : styles.expense,
                  ]}
                >
                  {item.type === 'income' ? '+' : '-'}
                  {formatKrw(krw)}
                </Text>
              </View>
              <Text style={styles.entryMeta}>
                {item.date}
                {` · ${item.category}`}
                {item.vendor ? ` · ${item.vendor}` : ''}
                {item.cardLabel ? ` · ${item.cardLabel}` : ''}
                {foreignNote}
                {` · ${item.createdByName}`}
              </Text>
              {item.receiptUrl ? (
                <Image source={{ uri: item.receiptUrl }} style={styles.receiptThumb} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={formVisible} animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalContainer}>
          <StackScreenHeader title="현지 지출 추가" onBack={() => setFormVisible(false)} />
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
                  입금
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>내용</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 현지식비-선교팀"
              value={note}
              onChangeText={setNote}
            />

            <Text style={styles.label}>거래처</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 니마목사, 노닌"
              value={vendor}
              onChangeText={setVendor}
            />

            <Text style={styles.label}>항목</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {SETTLEMENT_BUDGET_ITEMS.map((item) => (
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

            <Text style={styles.label}>원화 금액 (카드 영수증 기준)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={amountText}
              onChangeText={setAmountText}
            />
            <Text style={styles.loginHint}>
              카드 결제 시 영수증·문자에 찍힌 원화를 입력하세요. 투그릭 원문은 영수증 사진에 남기면
              됩니다.
            </Text>

            <TouchableOpacity
              style={styles.converterToggle}
              onPress={() => setConverterOpen((open) => !open)}
            >
              <Text style={styles.converterToggleText}>
                {converterOpen ? '외화 계산 닫기' : '현금 외화 → 원화 계산 (고정 참고환율)'}
              </Text>
            </TouchableOpacity>
            {converterOpen ? (
              <View style={styles.converterBox}>
                <View style={styles.typeRow}>
                  {SETTLEMENT_FOREIGN_CURRENCIES.map((option) => (
                    <TouchableOpacity
                      key={option.code}
                      style={[
                        styles.typeChip,
                        foreignCurrency === option.code && styles.typeChipActive,
                      ]}
                      onPress={() => setForeignCurrency(option.code as SettlementForeignCurrency)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          foreignCurrency === option.code && styles.typeChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={foreignCurrency === 'USD' ? '0.00' : '0'}
                  keyboardType={foreignCurrency === 'USD' ? 'decimal-pad' : 'number-pad'}
                  value={foreignAmountText}
                  onChangeText={setForeignAmountText}
                />
                <Text style={styles.converterPreview}>
                  참고환율 적용 {formatKrw(convertedForeignKrw)}
                </Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={applyConvertedAmount}>
                  <Text style={styles.secondaryButtonText}>이 원화 금액 사용</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.label}>결제수단</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 팀 카드, 현금"
              value={cardLabel}
              onChangeText={setCardLabel}
            />

            <Text style={styles.label}>날짜 (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} />

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

      <Modal visible={exportVisible} animationType="slide" onRequestClose={() => setExportVisible(false)}>
        <View style={styles.modalContainer}>
          <StackScreenHeader title="지출내역 붙여넣기" onBack={() => setExportVisible(false)} />
          <ScrollView contentContainerStyle={styles.formContent}>
            <Text style={styles.loginHint}>
              엑셀 「지출내역」 시트에서 월·일 열이 있는 빈 행에 붙여넣으세요. 열 순서:{' '}
              {EXPENSE_SHEET_COLUMNS.join(' · ')}. 잔액 열은 비워 두었으니 엑셀 수식이 계산합니다.
            </Text>
            <Text selectable style={styles.tsvPreview}>
              {exportTsv || '(내보낼 내역이 없습니다)'}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void handleShareTsv()}
              disabled={!exportTsv}
            >
              <Text style={styles.primaryButtonText}>공유 / 복사</Text>
            </TouchableOpacity>
            <Text style={styles.loginHint}>
              텍스트를 길게 눌러 복사하거나, 공유 시트에서 복사·메모장으로 보낼 수 있습니다.
            </Text>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={ratesVisible} animationType="slide" onRequestClose={() => setRatesVisible(false)}>
        <View style={styles.modalContainer}>
          <StackScreenHeader title="고정 참고환율" onBack={() => setRatesVisible(false)} />
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.loginHint}>
              카드 영수증에 원화가 있으면 그 금액을 그대로 씁니다. 현금 외화를 원화로 바꿀 때만 이
              환율을 씁니다. 정산 담당자 모두에게 공유됩니다.
            </Text>
            <Text style={styles.label}>1달러 = ? 원</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={usdRateText}
              onChangeText={setUsdRateText}
            />
            <Text style={styles.label}>1,000투그릭 = ? 원</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={mntThousandText}
              onChangeText={setMntThousandText}
            />
            <TouchableOpacity
              style={[styles.primaryButton, styles.saveButton]}
              onPress={() => void handleSaveRates()}
              disabled={savingRates}
            >
              {savingRates ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>환율 저장</Text>
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
  summaryScope: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
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
  itemSummaryBlock: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#99F6E4',
  },
  itemSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemSummaryLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  itemSummaryValue: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  rateChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  rateChipText: {
    flex: 1,
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
    paddingRight: 8,
  },
  rateChipEdit: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '800',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionFlex: {
    flex: 1,
  },
  exportButton: {
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    gap: 8,
  },
  entryCategory: {
    flex: 1,
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
  converterToggle: {
    paddingVertical: 8,
  },
  converterToggleText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
  },
  converterBox: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  converterPreview: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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
  tsvPreview: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
});
