import { Colors } from '../constants/Colors';
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WebSlingerProps {
    targetX: number;
    targetY: number;
    active: boolean;
}

export default function WebSlinger({ targetX, targetY, active }: WebSlingerProps) {
    const originX = SCREEN_WIDTH / 2;
    const originY = SCREEN_HEIGHT + 80;

    const progress = useSharedValue(0);
    const opacity = useSharedValue(0);
    const impactScale = useSharedValue(0);

    useEffect(() => {
        if (active) {
            progress.value = 0;
            opacity.value = 1;
            impactScale.value = 0;

            progress.value = withTiming(1, {
                duration: 200,
                easing: Easing.out(Easing.cubic)
            });

            impactScale.value = withDelay(180, withSequence(
                withSpring(1, { damping: 6, stiffness: 200 }),
                withTiming(1, { duration: 100 })
            ));
        } else {
            opacity.value = withTiming(0, { duration: 250 });
            progress.value = withTiming(0, { duration: 200 });
        }
    }, [active]);

    // Pre-calculate static impact web path
    const impactWebPath = useMemo(() => {
        const path = Skia.Path.Make();
        const numRays = 8;
        const radius = 30;

        for (let i = 0; i < numRays; i++) {
            const angle = (i * 2 * Math.PI) / numRays;
            path.moveTo(targetX, targetY);
            path.lineTo(
                targetX + Math.cos(angle) * radius,
                targetY + Math.sin(angle) * radius
            );
        }

        // Ring
        const ringRadius = radius * 0.5;
        for (let i = 0; i < numRays; i++) {
            const a1 = (i * 2 * Math.PI) / numRays;
            const a2 = ((i + 1) * 2 * Math.PI) / numRays;
            path.moveTo(targetX + Math.cos(a1) * ringRadius, targetY + Math.sin(a1) * ringRadius);
            path.lineTo(targetX + Math.cos(a2) * ringRadius, targetY + Math.sin(a2) * ringRadius);
        }

        return path;
    }, [targetX, targetY]);

    // Main strand path
    const mainStrand = useDerivedValue(() => {
        const path = Skia.Path.Make();
        const prog = progress.value;

        const currentX = originX + (targetX - originX) * prog;
        const currentY = originY + (targetY - originY) * prog;
        const midX = (originX + currentX) / 2;
        const midY = (originY + currentY) / 2 + 30 * (1 - prog);

        path.moveTo(originX, originY);
        path.quadTo(midX, midY, currentX, currentY);
        return path;
    }, [targetX, targetY]);

    // Left strand
    const leftStrand = useDerivedValue(() => {
        const path = Skia.Path.Make();
        const prog = progress.value;

        const startX = originX - 5;
        const endX = targetX - 8;
        const currentX = startX + (endX - startX) * prog;
        const currentY = originY + (targetY - originY) * prog;
        const midX = (startX + currentX) / 2 - 10;
        const midY = (originY + currentY) / 2 + 40 * (1 - prog);

        path.moveTo(startX, originY);
        path.quadTo(midX, midY, currentX, currentY + 5);
        return path;
    }, [targetX, targetY]);

    // Right strand
    const rightStrand = useDerivedValue(() => {
        const path = Skia.Path.Make();
        const prog = progress.value;

        const startX = originX + 5;
        const endX = targetX + 8;
        const currentX = startX + (endX - startX) * prog;
        const currentY = originY + (targetY - originY) * prog;
        const midX = (startX + currentX) / 2 + 10;
        const midY = (originY + currentY) / 2 + 40 * (1 - prog);

        path.moveTo(startX, originY);
        path.quadTo(midX, midY, currentX, currentY + 5);
        return path;
    }, [targetX, targetY]);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (!active && opacity.value === 0) return null;

    return (
        <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} pointerEvents="none">
            <Canvas style={StyleSheet.absoluteFill}>
                {/* Glow layer */}
                <Path
                    path={mainStrand}
                    color={Colors.glitchCyan}
                    style="stroke"
                    strokeWidth={8}
                    strokeCap="round"
                    opacity={0.2}
                />

                {/* Side strands */}
                <Path
                    path={leftStrand}
                    color="white"
                    style="stroke"
                    strokeWidth={2}
                    strokeCap="round"
                    opacity={0.6}
                />
                <Path
                    path={rightStrand}
                    color="white"
                    style="stroke"
                    strokeWidth={2}
                    strokeCap="round"
                    opacity={0.6}
                />

                {/* Main strand */}
                <Path
                    path={mainStrand}
                    color="white"
                    style="stroke"
                    strokeWidth={4}
                    strokeCap="round"
                    opacity={0.95}
                />

                {/* Impact web */}
                <Path
                    path={impactWebPath}
                    color="white"
                    style="stroke"
                    strokeWidth={2}
                    strokeCap="round"
                    opacity={interpolate(impactScale.value, [0, 0.5, 1], [0, 0.7, 0.9])}
                />
            </Canvas>
        </Animated.View>
    );
}
