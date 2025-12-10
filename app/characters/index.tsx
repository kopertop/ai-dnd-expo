import { useEffect } from 'react';
import { router } from 'expo-router';

const CharactersIndexScreen = () => {
	useEffect(() => {
		router.replace('/');
	}, []);

	return null;
};

export default CharactersIndexScreen;
