import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRequiredProfile } from '../context/ProfileContext';
import { getGuides, getRecommendedProducts } from '../core/recommend';
import { AGE_GROUP_LABELS, CONCERN_LABELS } from '../types';
import { colors, spacing } from '../theme';

export default function RecommendScreen() {
  const { profile } = useRequiredProfile();
  const guides = getGuides(profile);
  const products = getRecommendedProducts(profile);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.headline}>
        {AGE_GROUP_LABELS[profile.ageGroup]} 맞춤 가이드
      </Text>

      {guides.map((guide) => (
        <View key={guide.id} style={styles.guideCard}>
          <Text style={styles.guideConcern}>{CONCERN_LABELS[guide.concern]}</Text>
          <Text style={styles.guideTitle}>{guide.title}</Text>
          <Text style={styles.guideBody}>{guide.body}</Text>
        </View>
      ))}

      <Text style={styles.headline}>추천 제품·성분</Text>
      <Text style={styles.disclaimer}>
        특정 브랜드가 아닌 성분·카테고리 기준 추천이에요. 의약품은 반드시
        전문가와 상담하세요.
      </Text>

      {products.map((product) => (
        <View key={product.id} style={styles.productCard}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
          </View>
          {product.keyIngredients.length > 0 && (
            <View style={styles.ingredientRow}>
              {product.keyIngredients.map((ingredient) => (
                <Text key={ingredient} style={styles.ingredientChip}>
                  {ingredient}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.productDescription}>{product.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm + 4,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  guideCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs,
  },
  guideConcern: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  guideBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  productCategory: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ingredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  ingredientChip: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  productDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
