import { Stack } from 'expo-router';
import React from 'react';

import { useGameState } from '@/hooks/use-game-state';

const GameLayout: React.FC = () => {
	const { gameState } = useGameState();
	const gameName = gameState?.gameWorld || 'D&D Adventure';

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="(tabs)"
				options={{
					headerShown: true,
					title: gameName,
					headerTitleAlign: 'center',
					headerStyle: {
						backgroundColor: '#F9F6EF',
					},
				}}
			/>
		</Stack>
	);
};

export default GameLayout;
