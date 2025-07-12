import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
	visible,
	title,
	message,
	onConfirm,
	onCancel,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
}) => (
	<Modal
		visible={visible}
		transparent
		animationType="fade"
		onRequestClose={onCancel}
	>
		<View style={styles.overlay}>
			<View style={styles.modalBox}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.message}>{message}</Text>
				<View style={styles.buttonRow}>
					<TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
						<Text style={styles.cancelButtonText}>{cancelLabel}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
						<Text style={styles.confirmButtonText}>{confirmLabel}</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	</Modal>
);

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.25)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalBox: {
		backgroundColor: '#F9F6EF',
		borderRadius: 16,
		padding: 28,
		minWidth: 300,
		maxWidth: 400,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 12,
		textAlign: 'center',
	},
	message: {
		fontSize: 16,
		color: '#3B2F1B',
		marginBottom: 24,
		textAlign: 'center',
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		gap: 16,
	},
	cancelButton: {
		flex: 1,
		backgroundColor: '#E2D3B3',
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: 'center',
		marginRight: 8,
	},
	cancelButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	confirmButton: {
		flex: 1,
		backgroundColor: '#C9B037',
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: 'center',
		marginLeft: 8,
	},
	confirmButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
