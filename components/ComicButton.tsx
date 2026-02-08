import { Colors } from '../constants/Colors';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface ComicButtonProps {
    title: string;
    onPress: () => void;
    color?: string;
    textColor?: string;
    accentColor?: string;
    rotate?: string;
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
}

export default function ComicButton({
    title,
    onPress,
    color = Colors.spiderRed,
    textColor = 'white',
    accentColor = Colors.glitchCyan,
    rotate = '-2deg',
    size = 'medium',
    disabled = false,
}: ComicButtonProps) {
    const scale = useSharedValue(1);
    const glitchX = useSharedValue(0);
    const pressed = useSharedValue(false);

    // Idle glitch animation
    useEffect(() => {
        glitchX.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 3000 }),
                withTiming(3, { duration: 30, easing: Easing.linear }),
                withTiming(-2, { duration: 20, easing: Easing.linear }),
                withTiming(0, { duration: 50, easing: Easing.out(Easing.cubic) }),
                withTiming(0, { duration: 2000 + Math.random() * 3000 })
            ),
            -1,
            false
        );
    }, []);

    const handlePress = useCallback(() => {
        if (!disabled) {
            onPress();
        }
    }, [onPress, disabled]);

    const tapGesture = Gesture.Tap()
        .onBegin(() => {
            pressed.value = true;
            scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        })
        .onFinalize(() => {
            pressed.value = false;
            scale.value = withSpring(1, { damping: 10, stiffness: 300 });
            runOnJS(handlePress)();
        });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate },
        ],
    }));

    const animatedGlitchStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: glitchX.value }],
    }));

    const fontSize = size === 'large' ? 32 : size === 'small' ? 20 : 26;
    const paddingVertical = size === 'large' ? 22 : size === 'small' ? 12 : 18;
    const paddingHorizontal = size === 'large' ? 50 : size === 'small' ? 25 : 40;

    return (
        <GestureDetector gesture={tapGesture}>
            <Animated.View style={[styles.container, animatedContainerStyle]}>
                {/* Deep black shadow - 3D extrusion effect */}
                <View style={[styles.shadowLayer, styles.shadow3, { backgroundColor: 'black' }]} />
                <View style={[styles.shadowLayer, styles.shadow2, { backgroundColor: 'black' }]} />
                <View style={[styles.shadowLayer, styles.shadow1, { backgroundColor: 'black' }]} />

                {/* Color accent shadow (glitch effect) */}
                <Animated.View
                    style={[
                        styles.shadowLayer,
                        styles.accentShadow,
                        { backgroundColor: accentColor },
                        animatedGlitchStyle
                    ]}
                />

                {/* Main button */}
                <View
                    style={[
                        styles.button,
                        {
                            backgroundColor: color,
                            paddingVertical,
                            paddingHorizontal,
                            opacity: disabled ? 0.5 : 1,
                        },
                    ]}
                >
                    {/* Text shadow layers for 3D effect */}
                    <Text style={[styles.text, styles.textShadow3, { fontSize }]}>{title}</Text>
                    <Text style={[styles.text, styles.textShadow2, { fontSize }]}>{title}</Text>
                    <Text style={[styles.text, styles.textShadow1, { fontSize }]}>{title}</Text>

                    {/* Main text */}
                    <Text style={[styles.text, { fontSize, color: textColor }]}>{title}</Text>

                    {/* Highlight overlay */}
                    <Text
                        style={[
                            styles.text,
                            styles.textHighlight,
                            { fontSize, color: 'white' },
                        ]}
                    >
                        {title}
                    </Text>
                </View>

                {/* Hand-drawn edge effect */}
                <View style={styles.edgeTop} />
                <View style={styles.edgeBottom} />
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignSelf: 'center',
    },
    shadowLayer: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 3,
        borderColor: 'black',
    },
    shadow3: {
        transform: [{ translateX: 8 }, { translateY: 8 }],
    },
    shadow2: {
        transform: [{ translateX: 6 }, { translateY: 6 }],
    },
    shadow1: {
        transform: [{ translateX: 4 }, { translateY: 4 }],
    },
    accentShadow: {
        transform: [{ translateX: -4 }, { translateY: 4 }],
        opacity: 0.6,
        borderWidth: 0,
    },
    button: {
        borderWidth: 4,
        borderColor: 'black',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 200,
    },
    text: {
        fontFamily: 'Bangers_400Regular',
        textAlign: 'center',
        position: 'absolute',
    },
    textShadow3: {
        color: 'black',
        top: 3,
        left: 3,
    },
    textShadow2: {
        color: 'black',
        top: 2,
        left: 2,
    },
    textShadow1: {
        color: 'black',
        top: 1,
        left: 1,
    },
    textHighlight: {
        top: -1,
        left: -1,
        opacity: 0.3,
    },
    edgeTop: {
        position: 'absolute',
        top: -2,
        left: 10,
        right: 10,
        height: 2,
        backgroundColor: 'black',
        transform: [{ rotate: '0.5deg' }],
    },
    edgeBottom: {
        position: 'absolute',
        bottom: -2,
        left: 5,
        right: 15,
        height: 2,
        backgroundColor: 'black',
        transform: [{ rotate: '-0.5deg' }],
    },
});
