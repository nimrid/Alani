import { flag } from 'country-emoji';

export function getFlag(countryName: string): string {
  if (countryName === 'England') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (countryName === 'Wales') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
  if (countryName === 'Scotland') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if (countryName === 'Northern Ireland') return '🇬🇧'; // Or specific flag if desired
  return flag(countryName) || '⚽'; // fallback to soccer ball if no flag found
}

export function getGroupName(groupId?: number): string {
  if (groupId === 10115574) return 'Round of 16';
  if (groupId === 10115675) return 'Quarter-Finals';
  if (groupId === 10116166) return 'Friendlies';
  return 'Group Stage';
}
