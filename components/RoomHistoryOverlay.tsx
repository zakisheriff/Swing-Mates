import { Colors } from '../constants/Colors';
import { router } from 'expo-router';
import { Clock, Play, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { getRoomHistory, removeRoomFromHistory, RoomHistoryItem } from '../services/roomHistory';

interface RoomHistoryOverlayProps {
    visible: boolean;
    onClose: () => void;
    currentUsername: string;
}

export default function RoomHistoryOverlay({ visible, onClose, currentUsername }: RoomHistoryOverlayProps) {
    const [history, setHistory] = useState<RoomHistoryItem[]>([]);

    useEffect(() => {
        if (visible) {
            loadHistory();
        }
    }, [visible]);

    const loadHistory = async () => {
        const roomHistory = await getRoomHistory();
        setHistory(roomHistory);
    };

    const handleResume = (item: RoomHistoryItem) => {
        onClose();
        router.push({
            pathname: '/room/[id]',
            params: { id: item.roomId, username: currentUsername || item.username }
        });
    };

    const handleDelete = async (roomId: string) => {
        await removeRoomFromHistory(roomId);
        loadHistory();
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    entering={SlideInRight.duration(300)}
                    style={styles.container}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>🕸️ ROOM HISTORY</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X color="white" size={18} />
                        </TouchableOpacity>
                    </View>

                    {history.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No previous rooms</Text>
                            <Text style={styles.emptySubtext}>Your room history will appear here!</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={history}
                            keyExtractor={(item) => item.roomId + item.createdAt}
                            renderItem={({ item }) => (
                                <View style={styles.historyItem}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.roomCode}>ROOM: {item.roomId}</Text>
                                        <View style={styles.timeRow}>
                                            <Clock color="#888" size={12} />
                                            <Text style={styles.timeText}>{formatTime(item.lastVisited)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.itemActions}>
                                        <TouchableOpacity
                                            style={styles.resumeBtn}
                                            onPress={() => handleResume(item)}
                                        >
                                            <Play color="white" size={16} />
                                            <Text style={styles.resumeText}>RESUME</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => handleDelete(item.roomId)}
                                        >
                                            <Trash2 color="white" size={16} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxHeight: '70%',
        backgroundColor: '#111',
        borderRadius: 8,
        borderWidth: 4,
        borderColor: Colors.spiderBlue,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: Colors.spiderBlue,
        borderBottomWidth: 3,
        borderBottomColor: 'black',
    },
    title: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 20,
        color: 'white',
    },
    closeBtn: {
        backgroundColor: Colors.spiderRed,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 18,
        color: 'white',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#888',
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 10,
    },
    historyItem: {
        backgroundColor: '#222',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#444',
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemInfo: {
        flex: 1,
    },
    roomCode: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 16,
        color: Colors.spiderYellow,
        marginBottom: 4,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: '#888',
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resumeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.spiderGreen,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: 'white',
    },
    resumeText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 12,
        color: 'white',
    },
    deleteBtn: {
        backgroundColor: Colors.spiderRed,
        padding: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: 'white',
    },
});
