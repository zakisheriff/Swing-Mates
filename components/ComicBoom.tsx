import { Colors } from '../constants/Colors';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

export type BoomShape = 'explosion' | 'cloud' | 'star' | 'jagged' | 'burst';

interface ComicBoomProps {
    word: string;
    x?: number;
    y?: number;
    size?: number;
    color?: string;
    rotate?: number;
    delay?: number;
    shape?: BoomShape;
}

export default function ComicBoom({
    word,
    x = 0,
    y = 0,
    size = 40,
    color = Colors.spiderYellow,
    rotate = 0,
    delay = 0,
    shape = 'explosion'
}: ComicBoomProps) {
    const scale = useSharedValue(0);
    const shakeX = useSharedValue(0);

    // Generate random shape paths
    const shapePath = useMemo(() => {
        const center = 50;
        const radius = 45;

        switch (shape) {
            case 'cloud': {
                // Approximate jagged cloud
                return `M 30,50 
                        Q 20,30 40,30 
                        Q 40,10 60,10 
                        Q 80,10 80,30 
                        Q 100,30 90,50 
                        Q 100,70 80,70 
                        Q 80,90 60,90 
                        Q 40,90 40,70 
                        Q 20,70 30,50 Z`;
            }
            case 'star': {
                // 5-point star
                const points = [];
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? radius : radius * 0.4;
                    const angle = (Math.PI * i) / 5 - Math.PI / 2;
                    points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
                }
                return `M ${points.join(' ')} Z`;
            }
            case 'jagged': {
                // Random spiky
                const points = [];
                const spikes = 8;
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (Math.PI * i) / spikes;
                    const r = i % 2 === 0 ? radius : radius * 0.7; // Less variance
                    points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
                }
                return `M ${points.join(' ')} Z`;
            }
            case 'burst': {
                // Lots of thin spikes
                const points = [];
                const spikes = 16;
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (Math.PI * i) / spikes;
                    const r = i % 2 === 0 ? radius : radius * 0.3;
                    points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
                }
                return `M ${points.join(' ')} Z`;
            }
            case 'explosion':
            default: {
                // Standard comic explosion
                const points = [];
                const spikes = 12;
                for (let i = 0; i < spikes * 2; i++) {
                    const angle = (Math.PI * i) / spikes;
                    const r = i % 2 === 0 ? radius : radius * 0.5 + (Math.random() * 10);
                    points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
                }
                return `M ${points.join(' ')} Z`;
            }
        }
    }, [shape]);

    useEffect(() => {
        // Lifecycle: Hidden -> Pop In -> Stay (short) -> Pop Out -> Stay Hidden -> Repeat
        // Tighter timings for "come and go" feel
        const stayVisibleIds = 1500; // Fixed short duration
        const stayHiddenIds = Math.random() * 5000 + 3000; // 3-8s wait

        scale.value = withRepeat(
            withSequence(
                withDelay(delay, withTiming(0, { duration: 0 })), // Initial waiting period (staggered)
                withSpring(1, { damping: 10, stiffness: 200 }),   // Pop In
                withDelay(stayVisibleIds, withTiming(0, { duration: 250 })), // Poof Out quickly
                withDelay(stayHiddenIds, withTiming(0, { duration: 0 }))     // Wait for next cycle
            ),
            -1, // Loop forever
            false
        );

        // Continuous chaotic shake (only matters when visible, but cheap to run)
        shakeX.value = withRepeat(
            withSequence(
                withTiming(2, { duration: 80 }),
                withTiming(-2, { duration: 80 }),
                withTiming(0, { duration: 100 }),
                withDelay(Math.random() * 1000, withTiming(0, { duration: 0 }))
            ),
            -1,
            true
        );
    }, [delay, shape]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotate}deg` },
            { translateX: shakeX.value },
        ],
    }));

    return (
        <Animated.View style={[styles.container, { left: x, top: y, width: size * 3.5, height: size * 3.5 }, animatedStyle]}>
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                    {/* Shadow Layer */}
                    <Path
                        d={shapePath}
                        fill="black"
                        x="4"
                        y="4"
                    />
                    {/* Color Layer */}
                    <Path
                        d={shapePath}
                        fill={color}
                        stroke="black"
                        strokeWidth="2.5"
                    />
                </Svg>
            </View>

            <View style={styles.textContainer}>
                {/* 3D Black Extrusion Text */}
                <Animated.Text style={[styles.text, { fontSize: size, color: 'black', top: 2, left: 2 }]}>
                    {word}
                </Animated.Text>
                <Animated.Text style={[styles.text, { fontSize: size, color: 'black', top: 1, left: 1, textShadowColor: 'black', textShadowRadius: 1, textShadowOffset: { width: 2, height: 2 } }]}>
                    {word}
                </Animated.Text>

                {/* Main Text */}
                <Animated.Text style={[styles.text, { fontSize: size, color: 'white', top: 0, left: 0 }]}>
                    {word}
                </Animated.Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    textContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontFamily: 'Bangers_400Regular',
        position: 'absolute',
        textAlign: 'center',
    },
});
