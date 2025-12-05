import { router } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Character } from '@/types/character';
import { ExpoIcon } from './expo-icon';

type CharacterListProps = {
  characters: Character[];
  isLoading: boolean;
};

export const CharacterList: React.FC<CharacterListProps> = ({ characters, isLoading }) => {
  if (isLoading) {
    return <ThemedText style={styles.sectionHint}>Loading characters...</ThemedText>;
  }

  if (characters.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <ThemedText style={styles.sectionHint}>No characters found.</ThemedText>
      </View>
    );
  }

  return (
    <>
      {characters.map(character => (
        <TouchableOpacity
          key={character.id}
          style={styles.characterCard}
          onPress={() => router.push({ pathname: '/characters/[id]', params: { id: character.id } } as never)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {character.icon && <ExpoIcon icon={character.icon as any} size={24} color="#3B2F1B" />}
            <View>
              <ThemedText style={styles.characterName}>{character.name}</ThemedText>
              <ThemedText style={styles.characterMeta}>
                {character.race} {character.class} • Level {character.level}
              </ThemedText>
              {character.trait ? (
                <ThemedText style={styles.characterTrait}>{character.trait}</ThemedText>
              ) : null}
            </View>
          </View>
          <ThemedText style={styles.viewLabel}>View Sheet</ThemedText>
        </TouchableOpacity>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  sectionHint: {
    color: '#6B5B3D',
  },
  emptyCard: {
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  characterCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#E6D5B8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  characterName: {
    fontWeight: '600',
  },
  characterMeta: {
    color: '#6B5B3D',
  },
  characterTrait: {
    color: '#8A765C',
    fontSize: 12,
    marginTop: 2,
  },
  viewLabel: {
    color: '#8B6914',
    fontWeight: '700',
  },
});
