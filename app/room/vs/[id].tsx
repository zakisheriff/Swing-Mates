import DrawingCanvas, { CanvasRef } from '../../../components/DrawingCanvas';
import SpiderAlert from '../../../components/SpiderAlert';
import ToolBar from '../../../components/ToolBar';
import { Colors } from '../../../constants/Colors';
import socketService from '../../../services/socket';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Sample reference images for VS mode challenges
const CHALLENGE_IMAGES = [
    'https://img.icons8.com/emoji/200/cat-emoji.png',
    'https://img.icons8.com/emoji/200/dog-face.png',
    'https://img.icons8.com/emoji/200/sun-with-face.png',
    'https://img.icons8.com/emoji/200/rocket-emji.png',
    'https://img.icons8.com/emoji/200/house.png',
    'https://img.icons8.com/emoji/200/car-emoji.png',
];

export default function VSRoomScreen() {
    const { id, username, timeLimit = '60' } = useLocalSearchParams<{
        id: string;
        username: string;
        timeLimit?: string;
    }>();

    const [color, setColor] = useState(Colors.spiderRed);
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [isEraser, setIsEraser] = useState(false);
    const [timeLeft, setTimeLeft] = useState(parseInt(timeLimit));
    const [gameState, setGameState] = useState<'waiting' | 'playing' | 'submitted' | 'results'>('waiting');
    const [challengeImage, setChallengeImage] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    const [mySubmission, setMySubmission] = useState<string | null>(null);
    const [opponentSubmission, setOpponentSubmission] = useState<string | null>(null);
    const [showSubmitAlert, setShowSubmitAlert] = useState(false);
    const [isEyedropper, setIsEyedropper] = useState(false);

    const canvasRef = useRef<CanvasRef>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const userId = React.useMemo(
        () => username + '-' + Math.random().toString(36).substring(7),
        []
    );

    // Timer pulse animation
    const timerScale = useSharedValue(1);
    const timerAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: timerScale.value }],
    }));

    useEffect(() => {
        if (gameState === 'playing' && timeLeft <= 10) {
            timerScale.value = withRepeat(
                withTiming(1.1, { duration: 500 }),
                -1,
                true
            );
        }
    }, [gameState, timeLeft]);

    // Socket setup
    useEffect(() => {
        socketService.connect();
        socketService.emit('join-vs-room', id, userId);

        // Listen for opponent joining
        socketService.on('vs-opponent-joined', (data: { opponentId: string }) => {
            setOpponent(data.opponentId.split('-')[0]);
        });

        // Game start event
        socketService.on('vs-game-start', (data: { challengeImage: string }) => {
            setChallengeImage(data.challengeImage);
            setGameState('playing');
            setTimeLeft(parseInt(timeLimit));
            startTimer();
        });

        // Opponent submitted
        socketService.on('vs-opponent-submitted', () => {
            // Opponent has submitted, waiting for our submission or timer
        });

        // Both submitted / time's up
        socketService.on('vs-game-end', (data: { submissions: Record<string, string> }) => {
            setGameState('results');
            stopTimer();
            // Find opponent submission
            Object.entries(data.submissions).forEach(([odentId, uri]) => {
                if (!odentId.startsWith(username + '-')) {
                    setOpponentSubmission(uri);
                }
            });
        });

        return () => {
            socketService.off('vs-opponent-joined');
            socketService.off('vs-game-start');
            socketService.off('vs-opponent-submitted');
            socketService.off('vs-game-end');
            stopTimer();
        };
    }, [id, userId]);

    const startTimer = useCallback(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleTimeUp = async () => {
        stopTimer();
        await submitDrawing();
    };

    const submitDrawing = async () => {
        if (gameState === 'submitted') return;

        setGameState('submitted');

        // Capture canvas
        const uri = await canvasRef.current?.exportCanvas();
        if (uri) {
            setMySubmission(uri);
            socketService.emit('vs-submit', { roomId: id, userId, imageUri: uri });
        }
    };

    const handleSubmit = () => {
        setShowSubmitAlert(true);
    };

    const confirmSubmit = async () => {
        setShowSubmitAlert(false);
        await submitDrawing();
    };

    const handleColorSelect = (c: string) => {
        if (c === '#FFFFFF' || c.toLowerCase() === '#ffffff') {
            setIsEraser(true);
            setColor(c);
        } else {
            setIsEraser(false);
            setColor(c);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayAgain = () => {
        setGameState('waiting');
        setTimeLeft(parseInt(timeLimit));
        setMySubmission(null);
        setOpponentSubmission(null);
        setChallengeImage(null);
        canvasRef.current?.clear();
        socketService.emit('vs-ready', { roomId: id, userId });
    };

    const handleExit = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.modeLabel}>VS MODE</Text>
                    <Text style={styles.roomCode}>#{id}</Text>
                </View>

                {gameState === 'playing' && (
                    <Animated.View style={[styles.timerContainer, timerAnimStyle]}>
                        <Text style={[styles.timer, timeLeft <= 10 && styles.timerUrgent]}>
                            {formatTime(timeLeft)}
                        </Text>
                    </Animated.View>
                )}

                <View style={styles.headerRight}>
                    <Text style={styles.vsText}>VS</Text>
                    <Text style={styles.opponentName}>
                        {opponent || 'Waiting...'}
                    </Text>
                </View>
            </Animated.View>

            {/* Waiting State */}
            {gameState === 'waiting' && (
                <View style={styles.waitingContainer}>
                    <Text style={styles.waitingTitle}>⚡ WAITING FOR OPPONENT ⚡</Text>
                    <Text style={styles.waitingSubtitle}>
                        Share room code: <Text style={styles.codeHighlight}>{id}</Text>
                    </Text>
                    <View style={styles.loadingDots}>
                        {[0, 1, 2].map((i) => (
                            <Animated.View
                                key={i}
                                entering={FadeIn.delay(i * 200).duration(500)}
                                style={styles.dot}
                            />
                        ))}
                    </View>
                </View>
            )}

            {/* Playing State */}
            {(gameState === 'playing' || gameState === 'submitted') && (
                <>
                    {/* Challenge Image */}
                    {challengeImage && (
                        <View style={styles.challengeContainer}>
                            <Text style={styles.challengeLabel}>DRAW THIS:</Text>
                            <Image source={{ uri: challengeImage }} style={styles.challengeImage} />
                        </View>
                    )}

                    {/* Canvas */}
                    <View style={styles.canvasWrapper}>
                        <View style={styles.canvasShadow} />
                        <View style={styles.canvasFrame}>
                            <DrawingCanvas
                                ref={canvasRef}
                                roomId={`vs-${id}-${userId}`} // Solo mode - no sync
                                color={color}
                                strokeWidth={strokeWidth}
                                userId={userId}
                                isEraser={isEraser}
                                onColorPicked={(c) => {
                                    setColor(c);
                                    setIsEyedropper(false);
                                    setIsEraser(false);
                                }}
                            />
                            {gameState === 'submitted' && (
                                <View style={styles.submittedOverlay}>
                                    <Text style={styles.submittedText}>✓ SUBMITTED!</Text>
                                    <Text style={styles.waitingText}>Waiting for opponent...</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Submit Button */}
                    {gameState === 'playing' && (
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                            <Text style={styles.submitText}>SUBMIT!</Text>
                        </TouchableOpacity>
                    )}

                    {/* Toolbar */}
                    {gameState === 'playing' && (
                        <ToolBar
                            selectedColor={color}
                            onSelectColor={handleColorSelect}
                            strokeWidth={strokeWidth}
                            onSelectStrokeWidth={setStrokeWidth}
                            onClear={() => canvasRef.current?.clear()}
                            onUndo={() => canvasRef.current?.undo()}
                            onRedo={() => canvasRef.current?.redo()}
                            isEyedropperActive={isEyedropper}
                            onToggleEyedropper={() => {
                                canvasRef.current?.toggleEyedropper();
                                setIsEyedropper((p) => !p);
                            }}
                        />
                    )}
                </>
            )}

            {/* Results State */}
            {gameState === 'results' && (
                <Animated.View entering={SlideInUp.duration(500)} style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>⚡ RESULTS ⚡</Text>

                    <View style={styles.comparisonRow}>
                        <View style={styles.resultCard}>
                            <Text style={styles.resultLabel}>YOU</Text>
                            {mySubmission ? (
                                <Image source={{ uri: mySubmission }} style={styles.resultImage} />
                            ) : (
                                <View style={styles.noSubmission}>
                                    <Text style={styles.noSubmissionText}>No submission</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.vsBig}>VS</Text>

                        <View style={styles.resultCard}>
                            <Text style={styles.resultLabel}>{opponent?.toUpperCase() || 'OPPONENT'}</Text>
                            {opponentSubmission ? (
                                <Image source={{ uri: opponentSubmission }} style={styles.resultImage} />
                            ) : (
                                <View style={styles.noSubmission}>
                                    <Text style={styles.noSubmissionText}>No submission</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Original */}
                    {challengeImage && (
                        <View style={styles.originalContainer}>
                            <Text style={styles.originalLabel}>ORIGINAL</Text>
                            <Image source={{ uri: challengeImage }} style={styles.originalImage} />
                        </View>
                    )}

                    <View style={styles.resultActions}>
                        <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
                            <Text style={styles.playAgainText}>PLAY AGAIN</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
                            <Text style={styles.exitText}>EXIT</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* Submit Confirmation */}
            <SpiderAlert
                visible={showSubmitAlert}
                title="🎨 SUBMIT DRAWING?"
                message="Once submitted, you can't make changes!"
                onCancel={() => setShowSubmitAlert(false)}
                onConfirm={confirmSubmit}
                cancelText="KEEP DRAWING"
                confirmText="SUBMIT!"
                type="warning"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.spiderBlack,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: Colors.spiderViolet,
        borderBottomWidth: 4,
        borderBottomColor: 'black',
    },
    headerLeft: {
        alignItems: 'flex-start',
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    modeLabel: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 12,
        color: Colors.spiderYellow,
        letterSpacing: 2,
    },
    roomCode: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 18,
        color: 'white',
    },
    timerContainer: {
        backgroundColor: 'black',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: Colors.spiderYellow,
    },
    timer: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 28,
        color: 'white',
    },
    timerUrgent: {
        color: Colors.spiderRed,
    },
    vsText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 14,
        color: Colors.spiderYellow,
    },
    opponentName: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 16,
        color: 'white',
    },
    waitingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    waitingTitle: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 28,
        color: Colors.spiderYellow,
        textAlign: 'center',
        marginBottom: 10,
    },
    waitingSubtitle: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center',
    },
    codeHighlight: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 20,
        color: Colors.spiderRed,
        padding: 40,
        margin: 40,
    },
    loadingDots: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 10,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.spiderBlue,
    },
    challengeContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    challengeLabel: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 14,
        color: Colors.spiderYellow,
        marginBottom: 5,
    },
    challengeImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'white',
    },
    canvasWrapper: {
        flex: 1,
        margin: 10,
        position: 'relative',
    },
    canvasShadow: {
        position: 'absolute',
        top: 6,
        left: 6,
        right: -6,
        bottom: -6,
        backgroundColor: Colors.spiderViolet,
        opacity: 0.8,
    },
    canvasFrame: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 3,
        borderColor: 'black',
        overflow: 'hidden',
    },
    submittedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submittedText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 32,
        color: Colors.spiderGreen,
    },
    waitingText: {
        fontSize: 16,
        color: 'white',
        marginTop: 10,
    },
    submitBtn: {
        backgroundColor: Colors.spiderGreen,
        paddingVertical: 15,
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: 'black',
        alignItems: 'center',
    },
    submitText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 24,
        color: 'white',
    },
    resultsContainer: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
    },
    resultsTitle: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 32,
        color: Colors.spiderYellow,
        marginBottom: 20,
    },
    comparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    resultCard: {
        alignItems: 'center',
    },
    resultLabel: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 14,
        color: 'white',
        marginBottom: 8,
    },
    resultImage: {
        width: 140,
        height: 140,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: 'white',
        backgroundColor: '#eee',
    },
    noSubmission: {
        width: 140,
        height: 140,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#666',
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noSubmissionText: {
        color: '#888',
        fontSize: 12,
    },
    vsBig: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 36,
        color: Colors.spiderRed,
    },
    originalContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    originalLabel: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 12,
        color: '#888',
        marginBottom: 5,
    },
    originalImage: {
        width: 60,
        height: 60,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#666',
    },
    resultActions: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 30,
    },
    playAgainBtn: {
        backgroundColor: Colors.spiderBlue,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: 'white',
    },
    playAgainText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 18,
        color: 'white',
    },
    exitBtn: {
        backgroundColor: '#444',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#666',
    },
    exitText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 18,
        color: 'white',
    },
});
