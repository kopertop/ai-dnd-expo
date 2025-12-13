import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { useUploadedImages, useDeleteImage } from '@/hooks/api/use-image-queries';
import { ImageUploadModal } from '@/components/image-upload-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useAuth } from 'expo-auth-template/frontend';

interface MediaLibraryModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({ visible, onClose, onSelect }) => {
    const { data: images, isLoading, refetch } = useUploadedImages('both');
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const deleteImageMutation = useDeleteImage();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.is_admin === 1;

    const handleUploadSuccess = (url: string) => {
        setUploadModalVisible(false);
        refetch(); // Refresh list
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        await deleteImageMutation.mutateAsync(confirmDeleteId);
        setConfirmDeleteId(null);
        refetch();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <ThemedText type="subtitle">Media Library</ThemedText>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <ExpoIcon icon="Feather:x" size={24} color="#3B2F1B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.toolbar}>
                        <TouchableOpacity
                            style={styles.uploadBtn}
                            onPress={() => setUploadModalVisible(true)}
                        >
                            <ExpoIcon icon="Feather:upload" size={16} color="#FFF" />
                            <ThemedText style={styles.uploadBtnText}>Upload New</ThemedText>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#8B6914" style={{ flex: 1 }} />
                    ) : (
                        <ScrollView contentContainerStyle={styles.grid}>
                            {images?.map(img => (
                                <TouchableOpacity
                                    key={img.id}
                                    style={styles.item}
                                    onPress={() => {
                                        onSelect(img.public_url);
                                        onClose();
                                    }}
                                >
                                    <Image source={{ uri: img.public_url }} style={styles.thumb} resizeMode="contain" />
                                    <ThemedText style={styles.label} numberOfLines={1}>{img.title || img.filename}</ThemedText>

                                    {isAdmin && (
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setConfirmDeleteId(img.id);
                                            }}
                                        >
                                            <ExpoIcon icon="Feather:trash-2" size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            ))}
                            {(!images || images.length === 0) && (
                                <ThemedText>No images found.</ThemedText>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>

            <ImageUploadModal
                visible={uploadModalVisible}
                onClose={() => setUploadModalVisible(false)}
                onUploadSuccess={handleUploadSuccess}
            />

            <ConfirmModal
                visible={!!confirmDeleteId}
                title="Delete Image"
                message="Are you sure?"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDeleteId(null)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 800,
        height: '80%',
        backgroundColor: '#FFF9EF',
        borderRadius: 12,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2D3B3',
        backgroundColor: '#F5E6D3',
    },
    closeBtn: {
        padding: 4,
    },
    toolbar: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2D3B3',
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B6914',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignSelf: 'flex-start',
        gap: 8,
    },
    uploadBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    grid: {
        padding: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    item: {
        width: 100,
        alignItems: 'center',
        marginBottom: 10,
    },
    thumb: {
        width: 100,
        height: 100,
        backgroundColor: '#333',
        borderRadius: 4,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#E2D3B3',
    },
    label: {
        fontSize: 10,
        textAlign: 'center',
        width: '100%',
    },
    deleteBtn: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#8B2323',
        padding: 4,
        borderRadius: 4,
    },
});
