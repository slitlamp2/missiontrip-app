import React from 'react';
import { Linking, Text, type TextProps, type TextStyle } from 'react-native';

const SEGMENT_PATTERN = /(\*\*[^*]+\*\*|010[-\s]?\d{3,4}[-\s]?\d{4}|010\d{8})/g;

interface FormattedTextProps extends TextProps {
  children: string;
  style?: TextStyle;
  boldStyle?: TextStyle;
  phoneStyle?: TextStyle;
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function toTelUri(phone: string): string {
  return `tel:${phone.replace(/\D/g, '')}`;
}

export default function FormattedText({
  children,
  style,
  boldStyle,
  phoneStyle,
  ...textProps
}: FormattedTextProps) {
  const segments = children.split(SEGMENT_PATTERN).filter((segment) => segment.length > 0);

  return (
    <Text style={style} {...textProps}>
      {segments.map((segment, index) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return (
            <Text key={index} style={[style, boldStyle ?? styles.bold]}>
              {segment.slice(2, -2)}
            </Text>
          );
        }

        if (/^010/.test(segment)) {
          const display = formatPhoneDisplay(segment);
          return (
            <Text
              key={index}
              style={[style, phoneStyle ?? styles.phoneLink]}
              onPress={() => {
                void Linking.openURL(toTelUri(segment));
              }}
              accessibilityRole="link"
              accessibilityLabel={`${display} 전화 걸기`}
            >
              {display}
            </Text>
          );
        }

        return segment;
      })}
    </Text>
  );
}

const styles = {
  bold: {
    fontWeight: '800' as const,
    color: '#0F172A',
  },
  phoneLink: {
    color: '#2563EB',
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
};
