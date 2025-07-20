import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Message } from './cactus';

export const MessageBubble = ({ message }: { message: Message }) => (
	<View
		style={{
			backgroundColor: message.role === 'user' ? '#007AFF' : '#EEEEEE',
			borderRadius: 10,
			maxWidth: '80%',
			marginLeft: message.role === 'user' ? 'auto' : '2%',
			marginRight: message.role === 'user' ? '2%' : 'auto',
			marginBottom: 8,
			padding: 12,
		}}
	>
		{message.images && message.images.length > 0 && (
			<View style={{ marginBottom: 8 }}>
				{message.images.map((imageUri, index) => (
					<Image
						key={index}
						source={{ uri: imageUri }}
						style={{
							width: 200,
							height: 150,
							borderRadius: 8,
							marginBottom: index < message.images!.length - 1 ? 8 : 0,
						}}
						resizeMode="cover"
					/>
				))}
			</View>
		)}
		<Text
			style={{
				color: message.role === 'user' ? 'white' : 'black',
				fontSize: 16,
			}}
		>
			{message.content?.toString() || ''}
		</Text>
	</View>
);

export const MessageField = ({
	message,
	setMessage,
	onSendMessage,
	isGenerating,
	attachedImages,
	onAttachImage,
	onRemoveImage,
}: {
	message: string;
	setMessage: (text: string) => void;
	onSendMessage: () => void;
	isGenerating: boolean;
	attachedImages: string[];
	onAttachImage: () => void;
	onRemoveImage: (index: number) => void;
}) => (
	<View style={{ padding: 16, backgroundColor: 'white' }}>
		{/* Attached Images Preview */}
		{attachedImages.length > 0 && (
			<ScrollView
				horizontal
				style={{ marginBottom: 12 }}
				showsHorizontalScrollIndicator={false}
			>
				{attachedImages.map((imageUri, index) => (
					<View key={index} style={{ marginRight: 8, position: 'relative' }}>
						<Image
							source={{ uri: imageUri }}
							style={{
								width: 60,
								height: 60,
								borderRadius: 8,
								backgroundColor: '#f0f0f0',
							}}
							resizeMode="cover"
						/>
						<TouchableOpacity
							onPress={() => onRemoveImage(index)}
							style={{
								position: 'absolute',
								top: -8,
								right: -8,
								backgroundColor: '#FF3B30',
								borderRadius: 12,
								width: 24,
								height: 24,
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
								×
							</Text>
						</TouchableOpacity>
					</View>
				))}
			</ScrollView>
		)}

		{/* Input Row */}
		<View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
			{/* Camera Button */}
			<TouchableOpacity
				onPress={onAttachImage}
				style={{
					backgroundColor: '#007AFF',
					padding: 12,
					borderRadius: 8,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<Text style={{ color: 'white', fontSize: 16 }}>📷</Text>
			</TouchableOpacity>

			{/* Text Input */}
			<TextInput
				style={{
					flex: 1,
					borderWidth: 1,
					borderColor: '#ddd',
					borderRadius: 8,
					padding: 12,
					fontSize: 16,
					maxHeight: 100,
				}}
				value={message}
				onChangeText={setMessage}
				placeholder="Type a message or attach an image..."
				multiline
				editable={!isGenerating}
			/>

			{/* Send Button */}
			<TouchableOpacity
				onPress={onSendMessage}
				disabled={isGenerating || (!message.trim() && attachedImages.length === 0)}
				style={{
					backgroundColor:
						isGenerating || (!message.trim() && attachedImages.length === 0)
							? '#ccc'
							: '#007AFF',
					padding: 12,
					borderRadius: 8,
					justifyContent: 'center',
					alignItems: 'center',
					minWidth: 50,
				}}
			>
				<Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
					{isGenerating ? '...' : '➤'}
				</Text>
			</TouchableOpacity>
		</View>
	</View>
);

export const LoadingScreen = ({ progress }: { progress: number }) => (
	<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
		<Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
			Initializing VLM...
		</Text>
		<Text style={{ fontSize: 16, marginBottom: 10 }}>{(progress * 100).toFixed(1)}%</Text>
	</View>
);
