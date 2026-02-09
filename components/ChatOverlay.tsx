import * as Haptics from 'expo-haptics';
import { MessageSquare, Send, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import socketService from '../services/socket';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Message {
    id: string;
    userId: string;
    message: string;
    timestamp: number;
}

interface ChatProps {
    roomId: string;
    userId: string;
}

export default function ChatOverlay({ roomId, userId }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const glitchX = useSharedValue(0);

    // Use window dimensions for responsive layout
    const { width, height } = useWindowDimensions();
    const isMobileWeb = Platform.OS === 'web' && width < 768;

    const isOpenRef = useRef(isOpen);
    const textRef = useRef(text); // Store text in ref for Android

    // Keep text ref in sync
    useEffect(() => {
        textRef.current = text;
    }, [text]);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen]);

    // Keyboard listeners
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        const handleMessage = (data: any) => {
            setMessages((prev) => [...prev, { ...data, id: Math.random().toString() }]);

            if (!isOpenRef.current) {
                setUnreadCount(prev => prev + 1);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        };

        // Load existing messages when joining
        const handleLoadMessages = (msgs: any[]) => {
            if (msgs && Array.isArray(msgs)) {
                const formatted = msgs.map(m => ({ ...m, id: Math.random().toString() }));
                setMessages(formatted);
                setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
            }
        };

        socketService.on('receive-message', handleMessage);
        socketService.on('load-messages', handleLoadMessages);

        return () => {
            socketService.off('receive-message');
            socketService.off('load-messages');
        };
    }, []);

    const sendMessage = (inputText?: string) => {
        // On Android, prefer React state value over native event text to avoid truncation issues
        // The native event text can sometimes be incomplete when sent quickly
        const messageText = Platform.OS === 'android'
            ? text.trim()
            : (inputText || textRef.current || text).trim();
        if (!messageText) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        glitchX.value = withSequence(
            withTiming(5, { duration: 30 }),
            withTiming(-3, { duration: 20 }),
            withTiming(0, { duration: 50 })
        );

        const msgData = {
            roomId,
            message: messageText,
            userId,
            timestamp: Date.now(),
        };

        socketService.emit('send-message', msgData);
        setMessages((prev) => [...prev, { ...msgData, id: Math.random().toString() }]);

        // Clear text after sending - use small delay on Android to ensure UI updates properly
        if (Platform.OS === 'android') {
            setTimeout(() => {
                setText('');
                textRef.current = '';
            }, 10);
        } else {
            setText('');
            textRef.current = '';
        }

        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    };

    const handleSubmit = (e: any) => {
        // On Android, use state value; on iOS can use native event text
        const nativeText = Platform.OS === 'android' ? text : e?.nativeEvent?.text;
        sendMessage(nativeText);
    };

    const handleOpen = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsOpen(true);
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Keyboard.dismiss();
        setIsOpen(false);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: glitchX.value }],
    }));

    // Calculate chat position based on keyboard
    const chatBottom = Platform.OS === 'android'
        ? (keyboardHeight > 0 ? keyboardHeight + 10 : 100)
        : (keyboardHeight > 0 ? keyboardHeight + 10 : 90);

    const chatHeight = Platform.OS === 'android'
        ? Math.min(height * 0.45, 320)
        : Math.min(height * 0.45, 350);

    if (!isOpen) {
        return (
            <TouchableOpacity style={styles.openButton} onPress={handleOpen}>
                <MessageSquare color="black" size={24} strokeWidth={2.5} />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    // Dynamic styles for mobile web full screen
    const containerStyle = isMobileWeb
        ? {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: height,
            zIndex: 9999, // Ensure it's on top of everything
            padding: 0
        }
        : {
            bottom: chatBottom,
            height: chatHeight
        };

    const panelStyle = isMobileWeb
        ? {
            borderRadius: 0,
            borderWidth: 0,
            height: height,
        }
        : {};

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.container, containerStyle]}
        >
            <Animated.View style={[styles.panel, panelStyle, animatedStyle]}>
                {/* Header with close button */}
                <View style={[styles.header, isMobileWeb && styles.mobileWebHeader]}>
                    <Text style={styles.headerTitle}>SQUAD CHAT</Text>
                    <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                        <X color="white" size={18} strokeWidth={3} />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isOwn = item.userId === userId;
                        return (
                            <View style={[styles.bubbleContainer, isOwn ? styles.bubbleContainerRight : styles.bubbleContainerLeft]}>
                                <View style={[styles.bubble, isOwn ? styles.myBubble : styles.theirBubble]}>
                                    <Text style={styles.sender}>{item.userId.split('-')[0]}</Text>
                                    <Text style={styles.message}>{item.message}</Text>
                                </View>
                            </View>
                        );
                    }}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                />

                {/* Input row */}
                <View style={[styles.inputRow, isMobileWeb && styles.mobileWebInputRow]}>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={(t) => {
                            setText(t);
                            textRef.current = t; // Sync ref immediately
                        }}
                        placeholder="Message..."
                        placeholderTextColor="#888"
                        onSubmitEditing={handleSubmit}
                        returnKeyType="send"
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                        <Send color="black" size={18} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 10,
        left: 10,
        zIndex: 3000,
    },
    panel: {
        flex: 1,
        backgroundColor: '#FFFEF5',
        borderWidth: 3,
        borderColor: 'black',
        borderRadius: 4,
        shadowColor: Colors.spiderBlue,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 30,
        overflow: 'hidden',
    },
    openButton: {
        position: 'absolute',
        bottom: Platform.OS === 'android' ? 105 : 95,
        right: 15,
        backgroundColor: Colors.spiderRed,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'black',
        elevation: 20,
        zIndex: 3000,
        shadowColor: 'black',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.spiderYellow,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'black',
    },
    badgeText: {
        color: 'black',
        fontSize: 10,
        fontFamily: 'Bangers_400Regular',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        backgroundColor: Colors.spiderBlue,
        borderBottomWidth: 2,
        borderBottomColor: 'black',
    },
    headerTitle: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 16,
        color: 'black',
    },
    closeBtn: {
        backgroundColor: 'black',
        width: 26,
        height: 26,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    list: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    listContent: {
        padding: 8,
    },
    bubbleContainer: {
        marginBottom: 8,
        maxWidth: '80%',
    },
    bubbleContainerLeft: {
        alignSelf: 'flex-start',
    },
    bubbleContainerRight: {
        alignSelf: 'flex-end',
    },
    bubble: {
        padding: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: 'black',
    },
    myBubble: {
        backgroundColor: Colors.spiderRed,
    },
    theirBubble: {
        backgroundColor: Colors.spiderYellow,
    },
    sender: {
        fontSize: 9,
        fontFamily: 'Bangers_400Regular',
        color: 'black',
        marginBottom: 2,
        opacity: 0.7,
    },
    message: {
        fontSize: 13,
        color: 'black',
    },
    inputRow: {
        flexDirection: 'row',
        padding: 6,
        borderTopWidth: 2,
        borderTopColor: 'black',
        backgroundColor: '#222',
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderColor: 'black',
        backgroundColor: 'white',
        paddingHorizontal: Platform.OS === 'android' ? 12 : 10,
        paddingVertical: Platform.OS === 'android' ? 6 : 0,
        height: 36,
        marginRight: 6,
        borderRadius: 4,
        fontSize: Platform.OS === 'web' ? 16 : 14, // Min 16px for web to prevent zoom
        color: 'black',
        textAlignVertical: 'center',
    },
    sendBtn: {
        backgroundColor: Colors.spiderGreen,
        justifyContent: 'center',
        alignItems: 'center',
        width: 36,
        height: 36,
        borderWidth: 2,
        borderColor: 'black',
        borderRadius: 4,
    },
    mobileWebHeader: {
        paddingVertical: 12,
    },
    mobileWebInputRow: {
        paddingVertical: 12,
        paddingBottom: 20, // Extra padding for mobile browsers safe area
    },
});
