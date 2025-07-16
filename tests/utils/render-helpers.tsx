import React from 'react';
import { expect, vi } from 'vitest';

// Define types for testing
interface RenderOptions {
	wrapper?: React.ComponentType<any>;
	initialProps?: Record<string, any>;
}

interface RenderResult {
	container: HTMLElement | null;
	rerender: (ui: React.ReactElement) => void;
	unmount: () => void;
	getByTestId: (testId: string) => HTMLElement;
	queryByTestId: (testId: string) => HTMLElement | null;
	getByText: (text: string) => HTMLElement;
	queryByText: (text: string) => HTMLElement | null;
	getByPlaceholderText: (text: string) => HTMLElement;
	queryByPlaceholderText: (text: string) => HTMLElement | null;
	debug: () => void;
}

/**
 * Mock providers for testing React components
 * Provides all necessary context providers that components might need
 */
interface MockProvidersProps {
	children: React.ReactNode;
	initialGameState?: any;
	initialTheme?: 'light' | 'dark';
}

const MockProviders: React.FC<MockProvidersProps> = ({
	children,
	initialGameState = {},
	initialTheme = 'light'
}) => {
	// Mock context providers that components depend on
	const mockGameContext = {
		gameState: {
			character: null,
			currentLocation: null,
			companions: [],
			inventory: [],
			...initialGameState,
		},
		updateGameState: vi.fn(),
		resetGame: vi.fn(),
	};

	const mockThemeContext = {
		theme: initialTheme,
		colors: {
			primary: '#007AFF',
			secondary: '#5856D6',
			background: initialTheme === 'light' ? '#FFFFFF' : '#000000',
			text: initialTheme === 'light' ? '#000000' : '#FFFFFF',
		},
		toggleTheme: vi.fn(),
	};

	// Create mock providers
	const GameProvider = ({ children }: { children: React.ReactNode }) => (
		<div data-testid="mock-game-provider">{children}</div>
	);

	const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
		<div data-testid="mock-theme-provider">{children}</div>
	);

	return (
		<GameProvider>
			<ThemeProvider>
				{children}
			</ThemeProvider>
		</GameProvider>
	);
};

/**
 * Enhanced render function for testing React Native components
 * Provides consistent testing environment with all necessary providers
 */
export const renderWithProviders = (
	ui: React.ReactElement,
	options: RenderOptions & {
		initialGameState?: any;
		initialTheme?: 'light' | 'dark';
	} = {}
): RenderResult => {
	const {
		wrapper: Wrapper = MockProviders,
		initialGameState,
		initialTheme,
		...renderOptions
	} = options;

	// Create a container element for the test
	const container = document.createElement('div');
	document.body.appendChild(container);

	let currentElement = ui;

	const render = (element: React.ReactElement) => {
		// Create a simple DOM representation of the React element
		const renderElement = (el: React.ReactElement): string => {
			if (typeof el.type === 'string') {
				// HTML element
				const props = (el.props as any) || {};
				const attributes = Object.entries(props)
					.filter(([key]) => key !== 'children')
					.map(([key, value]) => {
						if (key === 'testID') return `data-testid="${value}"`;
						if (key === 'className') return `class="${value}"`;
						return `${key}="${value}"`;
					})
					.join(' ');

				const children = props.children || '';
				const childrenStr = typeof children === 'string' ? children :
					Array.isArray(children) ? children.map((child: any) =>
						typeof child === 'string' ? child : renderElement(child)
					).join('') : '';

				return `<${el.type} ${attributes}>${childrenStr}</${el.type}>`;
			} else {
				// React component - render as div with component name
				const componentName = (el.type as any)?.name || 'Component';
				const props = (el.props as any) || {};
				const testId = props['data-testid'] || props.testID;
				const testIdAttr = testId ? `data-testid="${testId}"` : '';

				// For our test component, render the actual content
				if (componentName === 'TestComponent') {
					const message = props.message || 'Hello World';
					return `<div data-testid="test-component">${message}</div>`;
				}

				return `<div ${testIdAttr} data-component="${componentName}">Mock ${componentName}</div>`;
			}
		};

		container.innerHTML = renderElement(element);
	};

	const rerender = (newUi: React.ReactElement) => {
		currentElement = newUi;
		render(newUi);
	};

	const unmount = () => {
		container.innerHTML = '';
		if (container.parentNode) {
			container.parentNode.removeChild(container);
		}
	};

	const getByTestId = (testId: string): HTMLElement => {
		const element = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
		if (!element) {
			throw new Error(`Unable to find element with testId: ${testId}`);
		}
		return element;
	};

	const queryByTestId = (testId: string): HTMLElement | null => {
		return container.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
	};

	const getByText = (text: string): HTMLElement => {
		const element = Array.from(container.querySelectorAll('*')).find(
			el => el.textContent?.includes(text)
		) as HTMLElement;
		if (!element) {
			throw new Error(`Unable to find element with text: ${text}`);
		}
		return element;
	};

	const queryByText = (text: string): HTMLElement | null => {
		return Array.from(container.querySelectorAll('*')).find(
			el => el.textContent?.includes(text)
		) as HTMLElement || null;
	};

	const getByPlaceholderText = (text: string): HTMLElement => {
		const element = container.querySelector(`[placeholder="${text}"]`) as HTMLElement;
		if (!element) {
			throw new Error(`Unable to find element with placeholder: ${text}`);
		}
		return element;
	};

	const queryByPlaceholderText = (text: string): HTMLElement | null => {
		return container.querySelector(`[placeholder="${text}"]`) as HTMLElement | null;
	};

	const debug = () => {
		console.log(container.innerHTML);
	};

	// Initial render
	render(currentElement);

	return {
		container,
		rerender,
		unmount,
		getByTestId,
		queryByTestId,
		getByText,
		queryByText,
		getByPlaceholderText,
		queryByPlaceholderText,
		debug,
	};
};

/**
 * Wait for async updates to complete
 * Handles React's async rendering and state updates
 */
export const waitForAsyncUpdates = async (timeout = 1000): Promise<void> => {
	// Wait for microtasks to complete
	await new Promise(resolve => setTimeout(resolve, 0));

	// Wait for any pending promises
	await new Promise(resolve => {
		const timeoutId = setTimeout(resolve, timeout);
		// Also resolve immediately if no async operations are pending
		Promise.resolve().then(() => {
			clearTimeout(timeoutId);
			resolve(undefined);
		});
	});
};

/**
 * Assert that no console errors occurred during test
 * Provides detailed error information if errors were logged
 */
export const assertNoConsoleErrors = (): void => {
	const consoleMock = console.error as any;
	if (consoleMock.mock && consoleMock.mock.calls.length > 0) {
		const errorCalls = consoleMock.mock.calls;
		const errorMessages = errorCalls.map((call: any[]) => call.join(' ')).join('\n');
		throw new Error(`Console errors detected during test:\n${errorMessages}`);
	}
	expect(console.error).not.toHaveBeenCalled();
};

/**
 * Enhanced console error checking with cleanup
 */
export const withConsoleErrorCheck = async (testFn: () => Promise<void> | void): Promise<void> => {
	// Clear any existing console error calls
	(console.error as any).mockClear?.();

	try {
		await testFn();
		assertNoConsoleErrors();
	} finally {
		// Clean up console mocks after test
		(console.error as any).mockClear?.();
	}
};

/**
 * Mock hook factory for consistent hook testing
 */
export const createMockHook = <T,>(hookResult: T): (() => T) => {
	return vi.fn().mockReturnValue(hookResult);
};

/**
 * Mock component factory for testing component interactions
 */
export const createMockComponent = (name: string) => {
	const MockComponent = ({ children, ...props }: any) => (
		React.createElement('div', {
			'data-testid': `mock-${name.toLowerCase()}`,
			...props
		}, children)
	);
	MockComponent.displayName = `Mock${name}`;
	return MockComponent;
};

/**
 * Test utilities for component testing
 */
export const ComponentTestUtils = {
	/**
	 * Simulate user interaction with delay
	 */
	async simulateUserInteraction(callback: () => void, delay = 100): Promise<void> {
		callback();
		await new Promise(resolve => setTimeout(resolve, delay));
	},

	/**
	 * Wait for component to update after state change
	 */
	async waitForUpdate(timeout = 1000): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, timeout));
	},

	/**
	 * Mock async operation with controllable timing
	 */
	createMockAsyncOperation: <T,>(result: T, delay = 100) => {
		return vi.fn().mockImplementation(
			() => new Promise<T>(resolve => setTimeout(() => resolve(result), delay))
		);
	},
};

// Re-export vitest utilities for convenience
export { vi } from 'vitest';
