import ComicForeground from '@/components/ComicForeground';
import CustomToast from '@/components/CustomToast';
import DimensionGlitchOverlay from '@/components/DimensionGlitchOverlay';
import GraffitiBackground from '@/components/GraffitiBackground';
import MessyInput from '@/components/MessyInput';
import SpiderSymbol from '@/components/SpiderSymbol';
import WebShoot from '@/components/WebShoot';
import WebSlinger from '@/components/WebSlinger';
import socketService from '@/services/socket';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height, width } = Dimensions.get('window');

// ACROSS THE SPIDER-VERSE AUTHENTIC COLORS
const ATSV = {
    milesRed: '#E23636',
    milesBlack: '#1A1A2E',
    electricBlue: '#00D4FF',
    hotPink: '#FF2D95',
    neonYellow: '#FFE135',
    prowlerPurple: '#9D4EDD',
    webWhite: '#FFFFFF',
};

export default function HomeScreen() {
    const router = useRouter();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [webShots, setWebShots] = useState<{ id: number, x: number, y: number }[]>([]);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'error' as 'error' | 'success' });
    const [webSlingerCoords, setWebSlingerCoords] = useState({ x: 0, y: 0 });
    const [webSlingerActive, setWebSlingerActive] = useState(false);

    useEffect(() => {
        socketService.connect();
    }, []);

    const showToast = (message: string, type: 'error' | 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleBackgroundTap = (evt: any) => {
        Keyboard.dismiss();
        setWebSlingerActive(false); // Fade away the web when touching elsewhere
        const { locationX, locationY } = evt.nativeEvent;
        const id = Date.now();

        // Add web shot
        setWebShots(prev => [...prev, { id, x: locationX, y: locationY }]);
    };

    const createSession = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (!username) {
            showToast('ENTER A NAME, HERO!', 'error');
            return;
        }
        const newRoomId = Math.floor(10000 + Math.random() * 90000).toString();
        router.push({ pathname: '/room/[id]', params: { id: newRoomId, username } });
    };

    const joinSession = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (!roomId || !username) {
            showToast('ENTER ROOM ID & NAME!', 'error');
            return;
        }
        if (!socketService.socket?.connected) socketService.connect();

        let answered = false;
        const timeout = setTimeout(() => {
            if (!answered) showToast('SERVER UNREACHABLE', 'error');
        }, 2000);

        socketService.emit('check-room', roomId, (exists: boolean) => {
            answered = true;
            clearTimeout(timeout);
            if (exists) {
                router.push({ pathname: '/room/[id]', params: { id: roomId, username } });
            } else {
                showToast('ROOM NOT FOUND!', 'error');
            }
        });
    };

    return (
        <TouchableWithoutFeedback onPress={handleBackgroundTap}>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <GraffitiBackground />
                <View style={styles.overlay} />
                <DimensionGlitchOverlay intensity="subtle" />

                <CustomToast
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    onHide={() => setToast(prev => ({ ...prev, visible: false }))}
                />

                {/* Web shooting effects */}
                {webShots.map(shot => (
                    <WebShoot
                        key={shot.id}
                        id={shot.id}
                        targetX={shot.x}
                        targetY={shot.y}
                        onComplete={() => setWebShots(prev => prev.filter(w => w.id !== shot.id))}
                    />
                ))}

                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'} style={styles.keyboardView}>
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                            <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>

                                {/* Spider Symbol - Smaller */}
                                <Animated.View entering={ZoomIn.delay(100).duration(400)} style={styles.spiderContainer}>
                                    <SpiderSymbol size={50} color={ATSV.milesRed} animated />
                                </Animated.View>

                                {/* SWING MATES Title - Tight like iOS */}
                                <View style={styles.titleWrapper}>
                                    <View style={styles.swingContainer}>
                                        <Text style={[styles.titleShadow, { top: 3, left: -3, color: ATSV.milesRed }]}>SWING</Text>
                                        <Text style={[styles.titleShadow, { top: 2, left: 2, color: ATSV.electricBlue }]}>SWING</Text>
                                        <Text style={[styles.titleText]}>SWING</Text>
                                    </View>
                                    <View style={styles.matesContainer}>
                                        <Text style={[styles.titleShadow, { top: 3, left: 3, color: ATSV.electricBlue }]}>MATES</Text>
                                        <Text style={[styles.titleShadow, { top: -2, left: -2, color: ATSV.hotPink }]}>MATES</Text>
                                        <Text style={[styles.titleText]}>MATES</Text>
                                    </View>
                                </View>

                                {/* Subtitle */}
                                <Animated.View entering={FadeInUp.delay(200)} style={styles.subtitleBadge}>
                                    <Text style={styles.subtitleText}>ACROSS THE SERVER-VERSE</Text>
                                </Animated.View>

                                {/* Inputs - Compact */}
                                <View style={styles.inputContainer}>
                                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                        <View>
                                            <MessyInput
                                                label="WHO ARE YOU?"
                                                placeholder="ALIAS..."
                                                value={username}
                                                onChangeText={setUsername}
                                                rotate="-1deg"
                                                borderColor="black"
                                                onWebTrigger={(x, y) => { setWebSlingerCoords({ x, y }); setWebSlingerActive(true); }}
                                                onWebRelease={() => setWebSlingerActive(false)}
                                            />
                                            <MessyInput
                                                label="ROOM CODE"
                                                placeholder="#####"
                                                value={roomId}
                                                onChangeText={(text) => setRoomId(text.replace(/[^0-9]/g, ''))}
                                                rotate="1deg"
                                                borderColor="black"
                                                onWebTrigger={(x, y) => { setWebSlingerCoords({ x, y }); setWebSlingerActive(true); }}
                                                onWebRelease={() => setWebSlingerActive(false)}
                                                keyboardType="numeric"
                                                maxLength={5}
                                            />
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>

                                {/* BUTTONS - Compact for Android */}
                                <Animated.View entering={FadeInUp.delay(400)} style={styles.buttonContainer}>
                                    {/* JUMP IN - Electric Blue */}
                                    <TouchableOpacity style={styles.jumpInBtn} onPress={joinSession} activeOpacity={0.9}>
                                        <View style={[styles.btnShadow, { backgroundColor: ATSV.hotPink, top: 3, left: -3 }]} />
                                        <View style={[styles.btnShadow, { backgroundColor: 'black', top: 4, left: 4 }]} />
                                        <View style={[styles.btnMain, { backgroundColor: ATSV.electricBlue }]}>
                                            <Text style={[styles.btnText, { color: 'black' }]}>JUMP IN!</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <Text style={styles.orText}>— MEANWHILE —</Text>

                                    {/* NEW DIMENSION - Miles Red */}
                                    <TouchableOpacity style={styles.newDimensionBtn} onPress={createSession} activeOpacity={0.9}>
                                        <View style={[styles.btnShadow, { backgroundColor: ATSV.prowlerPurple, top: 3, left: 3 }]} />
                                        <View style={[styles.btnShadow, { backgroundColor: 'black', top: 4, left: -4 }]} />
                                        <View style={[styles.btnMain, { backgroundColor: ATSV.milesRed }]}>
                                            <Text style={[styles.btnText, { color: 'white' }]}>NEW DIMENSION</Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>

                            </Animated.View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>

                <ComicForeground />

                {/* Full-screen WebSlinger - RENDERED LAST to be on top of everything */}
                <WebSlinger
                    targetX={webSlingerCoords.x}
                    targetY={webSlingerCoords.y}
                    active={webSlingerActive}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ATSV.milesBlack,
    },
    safeArea: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 10,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    spiderContainer: {
        marginBottom: 5,
    },
    titleWrapper: {
        marginBottom: 5,
        alignItems: 'center',
    },
    swingContainer: {
        position: 'relative',
        transform: [{ skewX: '-8deg' }, { rotate: '-3deg' }],
    },
    matesContainer: {
        position: 'relative',
        marginTop: Platform.OS === 'android' ? -40 : -12,
        transform: [{ skewX: '-8deg' }, { rotate: '2deg' }],
    },
    titleText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: Platform.OS === 'android' ? 48 : 56,
        color: 'black',
        textShadowColor: 'white',
        textShadowOffset: { width: -1, height: -1 },
        textShadowRadius: 0,
    },
    titleShadow: {
        position: 'absolute',
        fontFamily: 'Bangers_400Regular',
        fontSize: Platform.OS === 'android' ? 48 : 56,
    },
    subtitleBadge: {
        backgroundColor: 'black',
        paddingHorizontal: 14,
        paddingVertical: 4,
        transform: [{ rotate: '1deg' }],
        borderWidth: 2,
        borderColor: ATSV.neonYellow,
        marginBottom: 15,
    },
    subtitleText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 13,
        color: ATSV.neonYellow,
        letterSpacing: 1,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 5,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    jumpInBtn: {
        position: 'relative',
        width: Platform.OS === 'android' ? 240 : 280,
        transform: [{ rotate: '-2deg' }],
        marginBottom: 5,
    },
    newDimensionBtn: {
        position: 'relative',
        width: Platform.OS === 'android' ? 240 : 280,
        transform: [{ rotate: '2deg' }],
    },
    btnShadow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderWidth: 3,
        borderColor: 'black',
    },
    btnMain: {
        paddingVertical: Platform.OS === 'android' ? 10 : 14,
        paddingHorizontal: Platform.OS === 'android' ? 20 : 30,
        borderWidth: 3,
        borderColor: 'black',
        alignItems: 'center',
    },
    btnText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: Platform.OS === 'android' ? 20 : 24,
        letterSpacing: 1,
    },
    orText: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginVertical: 8,
    },
});
