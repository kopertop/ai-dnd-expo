import { create } from 'zustand';

export type LayoutType = 'phone' | 'tablet';
export type TabType = 'chat' | 'character' | 'map' | 'settings';

interface ModalState {
	characterSheet: boolean;
	settings: boolean;
	inventory: boolean;
	gameMenu: boolean;
}

interface LayoutState {
	currentLayout: LayoutType;
	activeTab: TabType;
	modals: ModalState;
	isTransitioning: boolean;
	orientation: 'portrait' | 'landscape';
	setLayout: (layout: LayoutType) => void;
	setActiveTab: (tab: TabType) => void;
	setOrientation: (orientation: 'portrait' | 'landscape') => void;
	openModal: (modal: keyof ModalState) => void;
	closeModal: (modal: keyof ModalState) => void;
	toggleModal: (modal: keyof ModalState) => void;
	closeAllModals: () => void;
	setTransitioning: (transitioning: boolean) => void;
}

const defaultModalState: ModalState = {
	characterSheet: false,
	settings: false,
	inventory: false,
	gameMenu: false,
};

export const useLayoutStore = create<LayoutState>(set => ({
	currentLayout: 'phone',
	activeTab: 'chat',
	modals: defaultModalState,
	isTransitioning: false,
	orientation: 'portrait',
	setLayout: layout => set({ currentLayout: layout }),
	setActiveTab: tab => set({ activeTab: tab }),
	setOrientation: orientation => set({ orientation }),
	openModal: modal =>
		set(state => ({
			modals: { ...state.modals, [modal]: true },
		})),
	closeModal: modal =>
		set(state => ({
			modals: { ...state.modals, [modal]: false },
		})),
	toggleModal: modal =>
		set(state => ({
			modals: { ...state.modals, [modal]: !state.modals[modal] },
		})),
	closeAllModals: () =>
		set({
			modals: defaultModalState,
		}),
	setTransitioning: transitioning => set({ isTransitioning: transitioning }),
}));
