import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InputMode = 'text' | 'voice';

interface InputModeContextValue {
	inputMode: InputMode;
	setInputMode: (mode: InputMode) => void;
	loading: boolean;
}

const InputModeContext = createContext<InputModeContextValue | undefined>(undefined);

const STORAGE_KEY = '@ai-dnd/inputMode';

export const InputModeProvider = ({ children }: { children: ReactNode }): React.ReactElement | null => {
	const [inputMode, setInputModeState] = useState<InputMode>('text');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		AsyncStorage.getItem(STORAGE_KEY)
			.then((value) => {
				if (value === 'text' || value === 'voice') {
					setInputModeState(value);
				}
			})
			.finally(() => setLoading(false));
	}, []);

	const setInputMode = (mode: InputMode) => {
		setInputModeState(mode);
		AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
	};

	return (
		<InputModeContext.Provider value={{ inputMode, setInputMode, loading }}>
			{children}
		</InputModeContext.Provider>
	);
};

export const useInputMode = () => {
	const ctx = useContext(InputModeContext);
	if (!ctx) throw new Error('useInputMode must be used within an InputModeProvider');
	return ctx;
};
