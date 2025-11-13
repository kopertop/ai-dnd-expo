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
					headerStyle: {
						backgroundColor: '#F9F6EF',
					},
					headerTitleStyle: {
						color: '#3B2F1B',
						fontWeight: 'bold',
					},
					headerTintColor: '#C9B037',
				}}
			/>
		</Stack>
	);
};

export default GameLayout;
