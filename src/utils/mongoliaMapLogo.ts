const MONGOLIA_FLAG_EMOJI = '🇲🇳';

export function stripMongoliaFlagEmoji(text: string): string {
  return text.replace(new RegExp(`${MONGOLIA_FLAG_EMOJI}\\s*`, 'g'), '');
}

export function hasMongoliaFlagEmoji(text: string): boolean {
  return text.includes(MONGOLIA_FLAG_EMOJI);
}
