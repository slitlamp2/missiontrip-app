import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getSession, type UserSession } from '../utils/auth';
import { enqueue, getQueue, getQueueCount, dequeue, type UploadQueueItem } from '../utils/uploadQueue';
import { processUploadQueue } from '../utils/uploadProcessor';
import { isFirebaseConfigured } from '../lib/firebase';
import { ensureFirebaseAuth } from '../lib/firebaseAuth';
import {
  deleteAlbumPhoto,
  saveAlbumPhotoToDeviceGallery,
  saveAlbumPhotosToDeviceGallery,
  subscribeAlbumPhotos,
  uploadAlbumPhotosFromUris,
  type AlbumBulkSaveProgress,
} from '../lib/albumService';
import type { AlbumPhoto } from '../types/album';

type GridItem =
  | { type: 'pending'; data: UploadQueueItem }
  | { type: 'uploaded'; data: AlbumPhoto };

/** 갤러리에서 한 번에 선택·추가할 수 있는 최대 장수 */
const MAX_UPLOAD_BATCH = 20;

export default function AlbumScreen() {
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected === true && netInfo.isInternetReachable !== false;
  const firebaseReady = isFirebaseConfigured();

  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [pendingQueue, setPendingQueue] = useState<UploadQueueItem[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<AlbumPhoto | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<AlbumBulkSaveProgress | null>(null);

  const gridItems = useMemo<GridItem[]>(() => {
    const pendingItems: GridItem[] = pendingQueue.map((item) => ({ type: 'pending', data: item }));
    const uploadedItems: GridItem[] = photos.map((item) => ({ type: 'uploaded', data: item }));
    return [...pendingItems, ...uploadedItems];
  }, [pendingQueue, photos]);

  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedIds.includes(photo.id)),
    [photos, selectedIds],
  );

  const refreshQueue = useCallback(async () => {
    const [queue, count, currentSession] = await Promise.all([getQueue(), getQueueCount(), getSession()]);
    setPendingQueue(queue);
    setQueueCount(count);
    setSession(currentSession);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshQueue();
    }, [refreshQueue]),
  );

  useEffect(() => {
    if (!firebaseReady) {
      setPhotos([]);
      setSyncError(
        'Firebase 설정이 없습니다. EAS 빌드에 EXPO_PUBLIC_FIREBASE_* 환경 변수를 등록해 주세요.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeAlbumPhotos(
      (data) => {
        setPhotos(data);
        setLoading(false);
        setSyncError(null);
      },
      (error) => {
        setSyncError(error.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [firebaseReady]);

  useEffect(() => {
    if (!isOnline || !firebaseReady) return;

    const runQueue = async () => {
      setIsProcessing(true);
      try {
        await ensureFirebaseAuth();
        const processed = await processUploadQueue();
        if (processed > 0) {
          await refreshQueue();
        }
      } finally {
        setIsProcessing(false);
      }
    };

    runQueue();
  }, [isOnline, firebaseReady, refreshQueue]);

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds([]);
      }
      return next;
    });
    setPreview(null);
  }, []);

  const toggleTileSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const isOwnPhoto = useCallback(
    (uploaderId: string) => session?.id === uploaderId,
    [session],
  );

  const saveToGallery = useCallback(async (photo: AlbumPhoto) => {
    try {
      setSavingId(photo.id);
      await saveAlbumPhotoToDeviceGallery(photo);
      Alert.alert('저장 완료', '사진 앱(갤러리)에 저장했습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장에 실패했습니다';
      Alert.alert('저장 오류', message);
    } finally {
      setSavingId(null);
    }
  }, []);

  const saveSelectedToGallery = useCallback(async () => {
    if (selectedPhotos.length === 0) return;

    setBulkProgress({ done: 0, total: selectedPhotos.length });
    try {
      const { saved, failed } = await saveAlbumPhotosToDeviceGallery(selectedPhotos, (progress) =>
        setBulkProgress(progress),
      );

      if (failed === 0) {
        Alert.alert('저장 완료', `${saved}장을 사진 앱(갤러리)에 저장했습니다.`);
      } else if (saved === 0) {
        Alert.alert('저장 실패', `${failed}장을 저장하지 못했습니다. 네트워크를 확인해 주세요.`);
      } else {
        Alert.alert('일부만 저장됨', `${saved}장은 저장했고, ${failed}장은 저장하지 못했습니다.`);
      }

      setSelectMode(false);
      setSelectedIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장에 실패했습니다';
      Alert.alert('저장 오류', message);
    } finally {
      setBulkProgress(null);
    }
  }, [selectedPhotos]);

  const confirmDelete = useCallback(
    (photo: AlbumPhoto) => {
      if (!isOwnPhoto(photo.uploaderId)) {
        Alert.alert('삭제 불가', '본인이 올린 사진만 삭제할 수 있습니다.');
        return;
      }

      Alert.alert('사진 삭제', '이 사진을 삭제할까요? (팀원 모두에게서 사라집니다)', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(photo.id);
            try {
              await ensureFirebaseAuth();
              await deleteAlbumPhoto(photo);
              setPreview((current) => (current?.id === photo.id ? null : current));
            } catch (error) {
              const message = error instanceof Error ? error.message : '삭제에 실패했습니다';
              Alert.alert('삭제 오류', message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    },
    [isOwnPhoto],
  );

  const confirmDeletePending = useCallback(
    (item: UploadQueueItem) => {
      if (!isOwnPhoto(item.uploaderId)) {
        Alert.alert('삭제 불가', '본인이 올린 사진만 삭제할 수 있습니다.');
        return;
      }

      Alert.alert('대기 취소', '업로드 대기 중인 사진을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await dequeue(item.id);
              await refreshQueue();
            } catch {
              Alert.alert('삭제 오류', '삭제에 실패했습니다.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    },
    [isOwnPhoto, refreshQueue],
  );

  const handlePickImage = async () => {
    const currentSession = await getSession();
    if (!currentSession) {
      Alert.alert('오류', '로그인 정보를 찾을 수 없습니다.');
      return;
    }

    if (!firebaseReady) {
      Alert.alert('설정 필요', '공유 앨범 동기화를 위해 Firebase 환경 변수가 필요합니다.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: MAX_UPLOAD_BATCH,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const assets = result.assets;

      if (isOnline) {
        setIsProcessing(true);
        setUploadProgress({ done: 0, total: assets.length });
        try {
          await ensureFirebaseAuth();
          const { uploaded, failed } = await uploadAlbumPhotosFromUris(
            assets.map((asset) => ({
              uri: asset.uri,
              mimeType: asset.mimeType,
              width: asset.width,
              height: asset.height,
            })),
            { id: currentSession.id, name: currentSession.name },
            (progress) => setUploadProgress(progress),
          );

          if (failed === 0) {
            Alert.alert('업로드 완료', `${uploaded}장을 공유 앨범에 올렸습니다.`);
          } else if (uploaded === 0) {
            Alert.alert('업로드 실패', `${failed}장을 올리지 못했습니다. 네트워크를 확인해 주세요.`);
          } else {
            Alert.alert('일부만 업로드됨', `${uploaded}장은 올렸고, ${failed}장은 실패했습니다.`);
          }
        } finally {
          setIsProcessing(false);
          setUploadProgress(null);
        }
      } else {
        for (const asset of assets) {
          await enqueue({
            localUri: asset.uri,
            uploaderId: currentSession.id,
            uploaderName: currentSession.name,
            mimeType: asset.mimeType ?? undefined,
            width: asset.width,
            height: asset.height,
          });
        }
        await refreshQueue();
        Alert.alert(
          '오프라인 저장',
          `${assets.length}장이 대기열에 저장되었습니다. 네트워크 연결 시 자동으로 업로드됩니다.`,
        );
      }
    } catch {
      Alert.alert('오류', '사진 선택 중 문제가 발생했습니다.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleTilePress = (item: GridItem) => {
    if (item.type === 'pending') {
      if (isOwnPhoto(item.data.uploaderId)) {
        Alert.alert('업로드 대기 중', '네트워크 연결 후 팀과 공유됩니다.', [
          { text: '확인', style: 'cancel' },
          { text: '대기 취소', style: 'destructive', onPress: () => confirmDeletePending(item.data) },
        ]);
      } else {
        Alert.alert('업로드 대기 중', '네트워크 연결 후 공유됩니다.');
      }
      return;
    }

    if (selectMode) {
      toggleTileSelected(item.data.id);
      return;
    }

    setPreview(item.data);
  };

  const handleTileLongPress = (item: GridItem) => {
    if (item.type === 'uploaded' && isOwnPhoto(item.data.uploaderId)) {
      setPreview(null);
      confirmDelete(item.data);
    }
  };

  const renderItem = ({ item }: { item: GridItem }) => {
    const uri = item.type === 'pending' ? item.data.localUri : item.data.downloadUrl;
    const isPending = item.type === 'pending';
    const uploaderName = item.data.uploaderName;
    const isSelected = item.type === 'uploaded' && selectedIds.includes(item.data.id);

    return (
      <Pressable
        style={[styles.gridItem, selectMode && isSelected && styles.gridItemSelected]}
        onPress={() => handleTilePress(item)}
        onLongPress={() => handleTileLongPress(item)}
        delayLongPress={450}
      >
        <Image source={{ uri }} style={styles.photo} />
        {isPending && (
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingText}>대기 중</Text>
          </View>
        )}
        {selectMode && item.type === 'uploaded' ? (
          <View style={styles.tileCheckWrap}>
            <View style={[styles.tileCheckCircle, isSelected && styles.tileCheckOn]}>
              {isSelected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
          </View>
        ) : null}
        <Text style={styles.uploaderName} numberOfLines={1}>
          {uploaderName}
        </Text>
      </Pressable>
    );
  };

  if (loading && photos.length === 0 && !syncError && pendingQueue.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
          <View style={[styles.badgeDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.badgeText, isOnline ? styles.badgeTextOnline : styles.badgeTextOffline]}>
            {isOnline ? '온라인' : '오프라인'}
          </Text>
        </View>

        {queueCount > 0 && (
          <View style={styles.queueBadge}>
            <Text style={styles.queueBadgeText}>미업로드 {queueCount}장</Text>
          </View>
        )}

        {(isProcessing || uploadProgress) && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.processingText}>
              {uploadProgress
                ? `압축·업로드 중 ${uploadProgress.done}/${uploadProgress.total}`
                : '업로드 처리 중...'}
            </Text>
          </View>
        )}
      </View>

      {syncError ? <Text style={styles.warnBanner}>{syncError}</Text> : null}

      {photos.length > 0 ? (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>
            팀원과 실시간으로 같이 봅니다. 사진을 눌러 저장하거나, 「선택」으로 여러 장을 저장할 수 있어요. 본인이 올린 사진은 삭제할 수 있습니다.
          </Text>
          <Pressable
            onPress={toggleSelectMode}
            style={({ pressed }) => [styles.selectModeBtn, pressed && styles.selectModeBtnPressed]}
            hitSlop={8}
          >
            <Text style={styles.selectModeBtnText}>{selectMode ? '완료' : '선택'}</Text>
          </Pressable>
        </View>
      ) : null}

      {gridItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>아직 공유된 사진이 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            아래 버튼으로 사진을 추가하세요.{'\n'}
            오프라인에서도 대기열에 저장됩니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(item) =>
            item.type === 'pending' ? `pending-${item.data.id}` : `uploaded-${item.data.id}`
          }
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={[styles.grid, selectMode && { paddingBottom: 120 }]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!selectMode ? (
        <TouchableOpacity
          style={[styles.addButton, (isPicking || isProcessing) && styles.addButtonDisabled]}
          onPress={handlePickImage}
          disabled={isPicking || isProcessing}
          activeOpacity={0.8}
        >
          {isPicking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>+ 사진 추가</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {selectMode ? (
        <View style={[styles.selectBar, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <Text style={styles.selectBarCount}>
            {bulkProgress
              ? `저장 중 ${bulkProgress.done}/${bulkProgress.total}`
              : `${selectedIds.length}장 선택`}
          </Text>
          <View style={styles.selectBarActions}>
            <Pressable
              style={({ pressed }) => [styles.selectBarBtn, pressed && styles.selectBarBtnPressed]}
              onPress={toggleSelectMode}
              disabled={!!bulkProgress}
            >
              <Text style={styles.selectBarBtnCancel}>취소</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.selectBarBtnPrimary,
                (!selectedIds.length || bulkProgress) && styles.selectBarBtnDisabled,
                pressed && selectedIds.length > 0 && !bulkProgress && styles.selectBarBtnPrimaryPressed,
              ]}
              onPress={saveSelectedToGallery}
              disabled={!selectedIds.length || !!bulkProgress}
            >
              {bulkProgress ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.selectBarBtnPrimaryText}>갤러리에 저장</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={!!preview && !selectMode} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPreview(null)}>
          <Pressable style={styles.modalInner} onPress={(event) => event.stopPropagation()}>
            {preview ? (
              <Image source={{ uri: preview.downloadUrl }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
            <View style={styles.modalActions}>
              {preview ? (
                <>
                  <Pressable
                    style={styles.modalBtn}
                    onPress={() => saveToGallery(preview)}
                    disabled={savingId === preview.id}
                  >
                    {savingId === preview.id ? (
                      <ActivityIndicator color="#2563EB" size="small" />
                    ) : (
                      <Ionicons name="download-outline" color="#2563EB" size={24} />
                    )}
                    <Text style={styles.modalBtnSave}>갤러리에 저장</Text>
                  </Pressable>
                  <View style={styles.modalActionsRight}>
                    {isOwnPhoto(preview.uploaderId) ? (
                      <Pressable
                        style={styles.modalBtn}
                        onPress={() => confirmDelete(preview)}
                        disabled={deletingId === preview.id}
                      >
                        {deletingId === preview.id ? (
                          <ActivityIndicator color="#DC2626" size="small" />
                        ) : (
                          <Ionicons name="trash-outline" color="#DC2626" size={22} />
                        )}
                        <Text style={styles.modalBtnDel}>삭제</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.modalBtn} onPress={() => setPreview(null)}>
                      <Ionicons name="close" color="#334155" size={26} />
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  warnBanner: {
    color: '#D97706',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  statusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  selectModeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  selectModeBtnPressed: {
    opacity: 0.85,
  },
  selectModeBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeOnline: {
    backgroundColor: '#ECFDF5',
  },
  badgeOffline: {
    backgroundColor: '#FEF2F2',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeTextOnline: {
    color: '#059669',
  },
  badgeTextOffline: {
    color: '#DC2626',
  },
  queueBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  queueBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  processingText: {
    fontSize: 13,
    color: '#64748B',
  },
  grid: {
    padding: 8,
    paddingBottom: 100,
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
    maxWidth: '33.33%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  gridItemSelected: {
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tileCheckWrap: {
    ...StyleSheet.absoluteFillObject,
    padding: 6,
    alignItems: 'flex-end',
  },
  tileCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileCheckOn: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  uploaderName: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#FFFFFF',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  selectBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  selectBarCount: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  selectBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectBarBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  selectBarBtnPressed: {
    opacity: 0.88,
  },
  selectBarBtnCancel: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  selectBarBtnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  selectBarBtnPrimaryPressed: {
    opacity: 0.92,
  },
  selectBarBtnDisabled: {
    opacity: 0.45,
  },
  selectBarBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    padding: 12,
  },
  modalInner: {
    flex: 1,
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  modalActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  modalBtnSave: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnDel: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
});
