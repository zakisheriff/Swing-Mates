import { Colors } from '../constants/Colors';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import SpiderWeb from './SpiderWeb';

const { width, height } = Dimensions.get('window');

// Animated ink splatter
function InkSplat({ x, y, color, size, delay }: { x: number; y: number; color: string; size: number; delay: number }) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(0, { duration: 0 }),
                    withTiming(1, { duration: 150, easing: Easing.out(Easing.back(2)) }),
                    withDelay(3000 + Math.random() * 5000, withTiming(0, { duration: 200 })),
                    withDelay(2000 + Math.random() * 4000, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            )
        );

        opacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(0, { duration: 0 }),
                    withTiming(0.8, { duration: 100 }),
                    withDelay(3000 + Math.random() * 5000, withTiming(0, { duration: 150 })),
                    withDelay(2000 + Math.random() * 4000, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            )
        );
    }, [delay]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[{ position: 'absolute', left: x, top: y }, animStyle]}>
            <Svg width={size * 2} height={size * 2} viewBox="0 0 100 100">
                {/* Irregular splatter shape */}
                <Path
                    d={`
                        M 50 10
                        C 70 15, 90 30, 85 50
                        C 95 55, 90 70, 80 75
                        C 85 85, 70 95, 50 90
                        C 40 95, 15 85, 15 70
                        C 5 60, 10 40, 25 30
                        C 20 20, 35 10, 50 10
                        Z
                    `}
                    fill={color}
                />
                {/* Drips */}
                <Ellipse cx="30" cy="95" rx="4" ry="8" fill={color} />
                <Ellipse cx="65" cy="98" rx="3" ry="6" fill={color} />
            </Svg>
        </Animated.View>
    );
}

// Animated action lines
function ActionLines() {
    const offset = useSharedValue(0);

    useEffect(() => {
        offset.value = withRepeat(
            withTiming(20, { duration: 500, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }],
    }));

    return (
        <Animated.View style={[styles.actionLinesContainer, animStyle]}>
            <Svg width={width + 40} height={height} style={{ opacity: 0.03 }}>
                {Array.from({ length: 30 }, (_, i) => (
                    <Line
                        key={i}
                        x1={-20 + i * 40}
                        y1={0}
                        x2={-20 + i * 40 - 100}
                        y2={height}
                        stroke={Colors.spiderRed}
                        strokeWidth={2}
                    />
                ))}
            </Svg>
        </Animated.View>
    );
}

// Spray paint drip
function SprayDrip({ x, delay }: { x: number; delay: number }) {
    const translateY = useSharedValue(-50);
    const opacity = useSharedValue(0);
    const color = [Colors.spiderRed, Colors.glitchCyan, Colors.glitchMagenta, Colors.spiderYellow][
        Math.floor(Math.random() * 4)
    ];

    useEffect(() => {
        translateY.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(-50, { duration: 0 }),
                    withTiming(height + 100, { duration: 8000 + Math.random() * 4000, easing: Easing.in(Easing.quad) }),
                    withDelay(5000, withTiming(-50, { duration: 0 }))
                ),
                -1,
                false
            )
        );

        opacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 500 }),
                    withDelay(7500 + Math.random() * 4000, withTiming(0, { duration: 500 })),
                    withDelay(5000, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            )
        );
    }, [delay]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[{ position: 'absolute', left: x, top: 0 }, animStyle]}>
            <Svg width={6} height={80} viewBox="0 0 6 80">
                <Rect x={0} y={0} width={6} height={60} fill={color} rx={3} />
                <Circle cx={3} cy={70} r={5} fill={color} />
            </Svg>
        </Animated.View>
    );
}

export default function GraffitiBackground() {
    // Generate static Ben-Day dots with color variation
    const dots = [];
    const spacing = 25;
    for (let i = 0; i < width; i += spacing) {
        for (let j = 0; j < height; j += spacing) {
            if ((i + j) % (spacing * 2) === 0) {
                const colorIndex = Math.floor((i * j) % 3);
                const dotColor = [Colors.glitchCyan, Colors.glitchMagenta, Colors.spiderRed][colorIndex];
                dots.push(
                    <Circle key={`${i}-${j}`} cx={i} cy={j} r={2} fill={dotColor} opacity={0.08} />
                );
            }
        }
    }

    // Random ink splats
    const splats = [
        { x: width * 0.1, y: height * 0.2, color: Colors.spiderRed, size: 40, delay: 0 },
        { x: width * 0.8, y: height * 0.15, color: Colors.glitchCyan, size: 30, delay: 2000 },
        { x: width * 0.2, y: height * 0.7, color: Colors.glitchMagenta, size: 35, delay: 4000 },
        { x: width * 0.7, y: height * 0.8, color: Colors.spiderYellow, size: 45, delay: 6000 },
        { x: width * 0.5, y: height * 0.4, color: Colors.spiderViolet, size: 25, delay: 8000 },
    ];

    // Spray drips
    const drips = [
        { x: width * 0.15, delay: 0 },
        { x: width * 0.35, delay: 3000 },
        { x: width * 0.65, delay: 6000 },
        { x: width * 0.85, delay: 9000 },
    ];

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Action lines background */}
            <ActionLines />

            {/* Ben-Day Dots Pattern */}
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                {dots}
            </Svg>

            {/* Animated ink splats */}
            {splats.map((splat, i) => (
                <InkSplat key={i} {...splat} />
            ))}

            {/* Spray drips */}
            {drips.map((drip, i) => (
                <SprayDrip key={i} {...drip} />
            ))}

            {/* Spider Webs - DENSE NEST */}
            <SpiderWeb size={280} style={{ position: 'absolute', top: -70, left: -70, opacity: 0.7 }} />
            <SpiderWeb size={240} style={{ position: 'absolute', bottom: -60, right: -60, transform: [{ rotate: '180deg' }], opacity: 0.6 }} />
            <SpiderWeb size={200} style={{ position: 'absolute', top: -50, right: -50, transform: [{ rotate: '90deg' }], opacity: 0.55 }} />
            <SpiderWeb size={220} style={{ position: 'absolute', bottom: -50, left: -50, transform: [{ rotate: '-90deg' }], opacity: 0.65 }} />

            {/* Edge webs */}
            <SpiderWeb size={130} style={{ position: 'absolute', top: 0, left: width * 0.4, opacity: 0.4, transform: [{ rotate: '15deg' }] }} />
            <SpiderWeb size={130} style={{ position: 'absolute', bottom: 0, right: width * 0.4, opacity: 0.4, transform: [{ rotate: '195deg' }] }} />
            <SpiderWeb size={110} style={{ position: 'absolute', top: height * 0.3, left: -35, opacity: 0.35, transform: [{ rotate: '-15deg' }] }} />
            <SpiderWeb size={110} style={{ position: 'absolute', top: height * 0.7, right: -35, opacity: 0.35, transform: [{ rotate: '165deg' }] }} />

            {/* Random hanging webs */}
            <SpiderWeb size={90} style={{ position: 'absolute', top: 160, right: 50, opacity: 0.25, transform: [{ rotate: '45deg' }] }} />
            <SpiderWeb size={100} style={{ position: 'absolute', bottom: 220, left: 30, opacity: 0.25, transform: [{ rotate: '-45deg' }] }} />

            {/* Glitch Rectangles - More aggressive */}
            <View style={[styles.glitchRect, { top: 80, left: -30, backgroundColor: Colors.glitchCyan, width: 180 }]} />
            <View style={[styles.glitchRect, { bottom: 180, right: -40, backgroundColor: Colors.glitchMagenta, width: 220 }]} />
            <View style={[styles.glitchRect, { top: height * 0.4, right: -20, backgroundColor: Colors.spiderRed, width: 160, height: 25 }]} />
            <View style={[styles.glitchRect, { bottom: height * 0.3, left: -25, backgroundColor: Colors.spiderYellow, width: 140, height: 20, opacity: 0.15 }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    glitchRect: {
        position: 'absolute',
        height: 50,
        width: 150,
        transform: [{ rotate: '15deg' }],
        opacity: 0.25,
    },
    actionLinesContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
});
