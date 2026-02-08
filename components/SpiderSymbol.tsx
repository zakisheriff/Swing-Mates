import { Colors } from '../constants/Colors';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

interface SpiderSymbolProps {
    size?: number;
    color?: string;
    style?: ViewStyle;
    animated?: boolean;
}

// Spider symbol SVG path (Miles Morales style)
const SPIDER_PATH = `
M 50 10
C 52 15, 55 20, 55 30
C 60 25, 70 15, 80 10
C 75 20, 70 30, 65 35
C 75 35, 88 30, 95 25
C 88 35, 75 42, 68 45
C 78 48, 90 50, 100 52
C 88 55, 75 55, 68 55
C 78 58, 90 62, 100 68
C 88 68, 75 65, 68 62
L 65 70
C 70 75, 78 85, 82 95
C 70 90, 62 80, 58 72
C 56 82, 54 92, 52 100
L 50 100
C 48 92, 46 82, 44 72
C 40 80, 32 90, 20 95
C 24 85, 32 75, 37 70
L 34 62
C 27 65, 14 68, 2 68
C 12 62, 24 58, 34 55
L 34 55
C 27 55, 14 55, 2 52
C 12 50, 24 48, 34 45
C 27 42, 14 35, 7 25
C 14 30, 27 35, 37 35
C 32 30, 27 20, 22 10
C 32 15, 42 25, 47 30
C 47 20, 50 15, 50 10
Z
`;

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export default function SpiderSymbol({
    size = 100,
    color = Colors.spiderRed,
    style,
    animated = true,
}: SpiderSymbolProps) {
    const scale = useSharedValue(1);
    const glitchX = useSharedValue(0);
    const opacity = useSharedValue(1);
    const cyanOffset = useSharedValue(0);
    const magentaOffset = useSharedValue(0);

    useEffect(() => {
        if (!animated) return;

        // Breathing/pulse animation
        scale.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.98, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Occasional glitch
        glitchX.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 5000 }),
                withTiming(4, { duration: 20 }),
                withTiming(-3, { duration: 15 }),
                withTiming(0, { duration: 30 }),
                withDelay(3000, withTiming(0, { duration: 0 }))
            ),
            -1,
            false
        );

        // Chromatic split
        cyanOffset.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 5000 }),
                withTiming(-3, { duration: 20 }),
                withTiming(0, { duration: 100 }),
                withDelay(3000, withTiming(0, { duration: 0 }))
            ),
            -1,
            false
        );

        magentaOffset.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 5000 }),
                withTiming(3, { duration: 20 }),
                withTiming(0, { duration: 100 }),
                withDelay(3000, withTiming(0, { duration: 0 }))
            ),
            -1,
            false
        );

        // Flicker
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 7000 }),
                withTiming(0.7, { duration: 30 }),
                withTiming(1, { duration: 30 }),
                withTiming(0.8, { duration: 20 }),
                withTiming(1, { duration: 50 }),
                withDelay(5000, withTiming(1, { duration: 0 }))
            ),
            -1,
            false
        );
    }, [animated]);

    const mainStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: glitchX.value }],
        opacity: opacity.value,
    }));

    const cyanStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: cyanOffset.value }],
        opacity: Math.abs(cyanOffset.value) > 0.5 ? 0.5 : 0,
    }));

    const magentaStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: magentaOffset.value }],
        opacity: Math.abs(magentaOffset.value) > 0.5 ? 0.5 : 0,
    }));

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            {/* Cyan chromatic layer */}
            <Animated.View style={[styles.layer, cyanStyle]}>
                <Svg width={size} height={size} viewBox="0 0 100 100">
                    <Path d={SPIDER_PATH} fill={Colors.glitchCyan} />
                </Svg>
            </Animated.View>

            {/* Magenta chromatic layer */}
            <Animated.View style={[styles.layer, magentaStyle]}>
                <Svg width={size} height={size} viewBox="0 0 100 100">
                    <Path d={SPIDER_PATH} fill={Colors.glitchMagenta} />
                </Svg>
            </Animated.View>

            {/* Main spider symbol */}
            <Animated.View style={[styles.layer, mainStyle]}>
                <Svg width={size} height={size} viewBox="0 0 100 100">
                    {/* Shadow */}
                    <Path d={SPIDER_PATH} fill="black" x="2" y="2" />
                    {/* Main color */}
                    <Path d={SPIDER_PATH} fill={color} />
                </Svg>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    layer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
