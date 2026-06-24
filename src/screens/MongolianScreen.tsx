import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import contentsData from '../data/contents.json';
import type { Contents } from '../types';

const contents = contentsData as Contents;

export default function MongolianScreen() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    contents.mongolian[0]?.category ?? null,
  );

  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        가이드북의 몽골어 회화입니다. 한국어 발음을 소리 내어 연습해 두면 현지에서 유용합니다.
      </Text>

      {contents.mongolian.map((section) => {
        const isExpanded = expandedCategory === section.category;

        return (
          <View key={section.category} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleCategory(section.category)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>{section.category}</Text>
              <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isExpanded &&
              section.phrases.map((phrase, index) => (
                <View
                  key={`${section.category}-${index}`}
                  style={[
                    styles.phraseRow,
                    index < section.phrases.length - 1 && styles.phraseRowBorder,
                  ]}
                >
                  <Text style={styles.korean}>{phrase.korean}</Text>
                  <Text style={styles.mongolian}>{phrase.mongolian}</Text>
                  <Text style={styles.pronunciation}>{phrase.pronunciation}</Text>
                </View>
              ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  intro: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  chevron: {
    fontSize: 12,
    color: '#94A3B8',
  },
  phraseRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAFBFC',
  },
  phraseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  korean: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  mongolian: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  pronunciation: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
