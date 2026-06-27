import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getSession } from '../utils/auth';
import { enqueue, getQueue, getQueueCount, type UploadQueueItem } from '../utils/uploadQueue';
import { getLocalPhotos, addLocalPhoto, type LocalAlbumPhoto } from '../utils/localAlbum';
import { processUploadQueue } from '../utils/uploadProcessor';

type GridItem =
  | { type: 'pending'; data: UploadQueueItem }
  | { type: 'uploaded'; data: LocalAlbumPhoto };

export default function AlbumScreen() {
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected === true && netInfo.isInternetReachable !== false;

  const [queueCount, setQueueCount] = useState(0);
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const refreshAlbum = useCallback(async () => {
    const [queue, photos, count] = await Promise.all([
      getQueue(),
      getLocalPhotos(),
      getQueueCount(),
    ]);

    const pendingItems: GridItem[] = queue.map((item) => ({ type: 'pending', data: item }));
    const uploadedItems: GridItem[] = photos.map((item) => ({ type: 'uploaded', data: item }));

    setGridItems([...pendingItems, ...uploadedItems]);
    setQueueCount(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAlbum();
    }, [refreshAlbum]),
  );

  useEffect(() => {
    if (!isOnline) return;

    const runQueue = async () => {
      setIsProcessing(true);
      try {
        const processed = await processUploadQueue();
        if (processed > 0) {
          await refreshAlbum();
        }
      } finally {
        setIsProcessing(false);
      }
    };

    runQueue();
  }, [isOnline, refreshAlbum]);

  const handlePickImage = async () => {
    const session = await getSession();
    if (!session) {
      Alert.alert('오류', '로그인 정보를 찾을 수 없습니다.');
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
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) return;

      const localUri = result.assets[0].uri;

      if (isOnline) {
        setIsProcessing(true);
        try {
          await addLocalPhoto({
            localUri,
            uploaderId: session.id,
            uploaderName: session.name,
          });
          await refreshAlbum();
          Alert.alert('업로드 완료', '사진이 공유 앨범에 추가되었습니다.');
        } finally {
          setIsProcessing(false);
        }
      } else {
        await enqueue({
          localUri,
          uploaderId: session.id,
          uploaderName: session.name,
        });
        await refreshAlbum();
        Alert.alert(
          '오프라인 저장',
          '네트워크 연결 시 자동으로 업로드됩니다. 대기열에 저장되었습니다.',
        );
      }
    } catch {
      Alert.alert('오류', '사진 선택 중 문제가 발생했습니다.');
    } finally {
      setIsPicking(false);
    }
  };

  const renderItem = ({ item }: { item: GridItem }) => {
    const uri = item.data.localUri;
    const isPending = item.type === 'pending';
    const uploaderName = item.data.uploaderName;

    return (
      <View style={styles.gridItem}>
        <Image source={{ uri }} style={styles.photo} />
        {isPending && (
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingText}>대기 중</Text>
          </View>
        )}
        <Text style={styles.uploaderName} numberOfLines={1}>
          {uploaderName}
        </Text>
      </View>
    );
  };

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

        {isProcessing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.processingText}>업로드 처리 중...</Text>
          </View>
        )}
      </View>

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
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
});
