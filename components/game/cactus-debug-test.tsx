import { Header } from '@react-navigation/elements';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cactus, Message } from '../cactus';
import { LoadingScreen, MessageBubble, MessageField } from '../messages';

const CactuDebugTest: React.FC = () => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [message, setMessage] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [attachedImages, setAttachedImages] = useState<string[]>([]);
	const [isInitialized, setIsInitialized] = useState(false);
	const [initProgress, setInitProgress] = useState(0);

	useEffect(() => {
		const initializeCactus = async () => {
			try {
				await cactus.initialize(progress => {
					setInitProgress(progress);
				});
				setIsInitialized(true);
			} catch (error) {
				console.error('Failed to initialize Cactus:', error);
				Alert.alert('Error', 'Failed to initialize VLM context');
			}
		};

		initializeCactus();
	}, []);

	const handleSendMessage = async () => {
		if (!message.trim() && attachedImages.length === 0) return;

		const userMessage: Message = {
			role: 'user',
			content: message,
			images: attachedImages.length > 0 ? attachedImages : undefined,
		};

		setMessages(prev => [...prev, userMessage]);
		setMessage('');
		setAttachedImages([]);
		setIsGenerating(true);

		try {
			const response = await cactus.generateResponse(userMessage);

			const assistantMessage: Message = {
				role: 'assistant',
				content: response,
			};

			setMessages(prev => [...prev, assistantMessage]);
		} catch (error) {
			console.error('Error generating response:', error);
			Alert.alert('Error', 'Failed to generate response');
		} finally {
			setIsGenerating(false);
		}
	};

	const handleAttachImage = async () => {
		const demoImageUri = await cactus.downloadDemoImage();
		if (demoImageUri.startsWith('file://') || demoImageUri.startsWith('/')) {
			setAttachedImages(prev => [...prev, demoImageUri]);
		} else {
			Alert.alert('Please wait', 'Demo image is still downloading...');
		}
	};

	const handleRemoveImage = (index: number) => {
		setAttachedImages(prev => prev.filter((_, i) => i !== index));
	};

	const handleClearConversation = () => {
		Alert.alert(
			'Clear Conversation',
			'Are you sure you want to clear the conversation history?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear',
					style: 'destructive',
					onPress: () => {
						cactus.clearConversation();
						setMessages([]);
						console.log('Conversation cleared');
					},
				},
			],
		);
	};

	if (!isInitialized) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
				<Header title="Cactus Debug Test" />
				<LoadingScreen progress={initProgress} />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
			<Header title="Cactus Debug Test" />
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					style={{ flex: 1, padding: 16 }}
					contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
				>
					{messages.map((msg, index) => (
						<MessageBubble key={index} message={msg} />
					))}
					{isGenerating && (
						<View style={{ padding: 16, alignItems: 'center' }}>
							<Text style={{ color: '#666' }}>Generating response...</Text>
						</View>
					)}
				</ScrollView>

				<MessageField
					message={message}
					setMessage={setMessage}
					onSendMessage={handleSendMessage}
					isGenerating={isGenerating}
					attachedImages={attachedImages}
					onAttachImage={handleAttachImage}
					onRemoveImage={handleRemoveImage}
				/>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
export default CactuDebugTest;
