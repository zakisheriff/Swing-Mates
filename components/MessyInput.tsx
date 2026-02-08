import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
    DimensionValue,
    GestureResponderEvent,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View
} from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface MessyInputProps extends TextInputProps {
    label: string;
    width?: DimensionValue;
    rotate?: string;
    borderColor?: string;
    onWebTrigger?: (x: number, y: number) => void;
    onWebRelease?: () => void; // Callback when input blurs to fade web
}

export default function MessyInput({
    label,
    width = '100%',
    rotate = '-1deg',
    borderColor = 'black',
    onWebTrigger,
    onWebRelease,
    ...props
}: MessyInputProps) {
    const glitchX = useSharedValue(0);
    const focusGlow = useSharedValue(0);
    const popValue = useSharedValue(0);
    const shakeValue = useSharedValue(0);
    const [isFocused, setIsFocused] = useState(false);
    const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
    const [webActive, setWebActive] = useState(false);

    const inputRef = React.useRef<TextInput>(null);

    useEffect(() => {
        // Subtle idle jitter
        glitchX.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 3000 }),
                withTiming(2, { duration: 30, easing: Easing.linear }),
                withTiming(-1, { duration: 20, easing: Easing.linear }),
                withTiming(0, { duration: 50 }),
                withTiming(0, { duration: 2000 + Math.random() * 2000 })
            ),
            -1,
            false
        );
    }, []);

    useEffect(() => {
        if (isFocused) {
            popValue.value = withSpring(1, { damping: 12, stiffness: 100 });
            focusGlow.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 500 }),
                    withTiming(0.5, { duration: 500 })
                ),
                -1,
                true
            );
        } else {
            popValue.value = withSpring(0, { damping: 15, stiffness: 100 });
            focusGlow.value = withTiming(0, { duration: 200 });
            setWebActive(false);
            onWebRelease?.(); // Notify parent to fade the web
        }
    }, [isFocused]);

    const handlePress = (e: GestureResponderEvent) => {
        if (isFocused) return; // Already interacting

        const { locationX, locationY, pageX, pageY } = e.nativeEvent;
        setTouchPos({ x: locationX, y: locationY });
        setWebActive(true);

        // Trigger the parent's WebSlinger with screen-relative coordinates
        onWebTrigger?.(pageX, pageY);

        // FORCEFUL shake when web sticks
        shakeValue.value = withSequence(
            withTiming(10, { duration: 30 }),
            withSpring(0, { damping: 3, stiffness: 200 })
        );

        // Haptic feedback
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        // REDUCED DELAY: Web sticks, then keyboard/pop after 200ms for seamless feel
        setTimeout(() => {
            inputRef.current?.focus();
        }, 200);
    };

    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate },
            { translateX: glitchX.value + shakeValue.value },
            { scale: interpolate(popValue.value, [0, 1], [1, 1.15]) } // FORCEFUL pull scale
        ],
        zIndex: isFocused ? 100 : 1,
        elevation: isFocused ? 20 : 0,
        shadowColor: '#000',
        shadowOpacity: interpolate(popValue.value, [0, 1], [0.2, 0.8]),
        shadowRadius: interpolate(popValue.value, [0, 1], [4, 30]),
        shadowOffset: {
            width: 0,
            height: interpolate(popValue.value, [0, 1], [2, 20])
        }
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: focusGlow.value,
    }));

    return (
        <Animated.View
            style={[styles.container, { width }, containerStyle]}
        >
            {/* Layer 1: Cyan glitch layer */}
            <View style={[styles.layer, {
                backgroundColor: Colors.glitchCyan,
                transform: [{ rotate: '2deg' }, { translateX: 4 }, { translateY: 4 }],
            }]} />

            {/* Layer 2: Magenta glitch layer */}
            <View style={[styles.layer, {
                backgroundColor: Colors.glitchMagenta,
                transform: [{ rotate: '-1deg' }, { translateX: -3 }, { translateY: 3 }],
            }]} />

            {/* Layer 3: Black shadow extrusion */}
            <View style={[styles.layer, {
                backgroundColor: 'black',
                transform: [{ translateX: 6 }, { translateY: 6 }],
            }]} />

            {/* Focus glow effect */}
            <Animated.View style={[styles.focusGlow, glowStyle]} />

            {/* Floating label badge - MOVED OUTSIDE inputBox to prevent clipping */}
            <View style={styles.labelContainer}>
                <View style={styles.labelShadow} />
                <View style={styles.labelBadge}>
                    <Text style={styles.label}>{label}</Text>
                </View>
            </View>

            {/* Main Input Box */}
            <View
                style={[styles.inputBox, { borderColor }]}
            >
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholderTextColor="#888"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        setWebActive(false);
                    }}
                    onPressIn={handlePress}
                    editable={true}
                    {...props}
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        marginTop: 20, // Increased to make room for floating label
        position: 'relative',
    },
    layer: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 0,
        opacity: 0.6,
    },
    focusGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.spiderBlue,
        transform: [{ scale: 1.02 }],
        opacity: 0,
    },
    inputBox: {
        backgroundColor: 'white',
        borderWidth: 3,
        padding: 4,
        zIndex: 10,
        position: 'relative',
        overflow: 'hidden',
    },
    labelContainer: {
        position: 'absolute',
        top: -14,
        left: 8,
        zIndex: 20,
    },
    labelShadow: {
        position: 'absolute',
        top: 2,
        left: 2,
        right: -2,
        bottom: -2,
        backgroundColor: 'black',
    },
    labelBadge: {
        backgroundColor: Colors.spiderYellow,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: 'black',
        transform: [{ rotate: '-2deg' }],
    },
    label: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 11,
        color: 'black',
        letterSpacing: 0.5,
    },
    input: {
        padding: 8,
        paddingTop: 10,
        fontFamily: 'Bangers_400Regular',
        fontSize: 18,
        color: 'black',
        // Removed backgroundColor: '#F5F5F5' to keep it transparent and show web
        minHeight: 42,
        letterSpacing: 1,
    },
});
