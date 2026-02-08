import { Colors } from '../constants/Colors';
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
    useDerivedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface InteractiveWebProps {
    x: number;
    y: number;
    active: boolean;
}

export default function InteractiveWeb({ x, y, active }: InteractiveWebProps) {
    const growth = useDerivedValue(() => {
        return withSpring(active ? 1.2 : 0, { damping: 10, stiffness: 80 });
    }, [active]);

    const vibration = useDerivedValue(() => {
        if (active) {
            return withSequence(
                withTiming(1, { duration: 40 }),
                withTiming(0, { duration: 300 })
            );
        }
        return 0;
    }, [active]);

    const createWebPath = (radius: number, rings: number) => {
        const path = Skia.Path.Make();
        const numRays = 10;

        // Draw radial lines
        for (let i = 0; i < numRays; i++) {
            const angle = (i * 2 * Math.PI) / numRays;
            path.moveTo(x, y);
            path.lineTo(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius
            );
        }

        // Draw connecting curves (the "webbing")
        for (let j = 1; j <= rings; j++) {
            const ringRadius = (radius / rings) * j;
            for (let i = 0; i < numRays; i++) {
                const angle1 = (i * 2 * Math.PI) / numRays;
                const angle2 = ((i + 1) * 2 * Math.PI) / numRays;
                const midAngle = (angle1 + angle2) / 2;
                const curveOffset = ringRadius * 0.85;

                path.moveTo(
                    x + Math.cos(angle1) * ringRadius,
                    y + Math.sin(angle1) * ringRadius
                );
                path.quadTo(
                    x + Math.cos(midAngle) * curveOffset,
                    y + Math.sin(midAngle) * curveOffset,
                    x + Math.cos(angle2) * ringRadius,
                    y + Math.sin(angle2) * ringRadius
                );
            }
        }
        return path;
    };

    const mainWeb = useMemo(() => createWebPath(250, 5), [x, y]);
    const glitchWeb = useMemo(() => createWebPath(260, 4), [x, y]);

    const matrix = useDerivedValue(() => {
        const m = Skia.Matrix();
        m.translate(x, y);
        const s = growth.value + (vibration.value * 0.1);
        m.scale(s, s);
        m.translate(-x, -y);
        return m;
    });

    if (!active && growth.value === 0) return null;

    return (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Group matrix={matrix}>
                {/* Chromatic aberration layers */}
                <Path
                    path={glitchWeb}
                    color={Colors.glitchCyan}
                    style="stroke"
                    strokeWidth={2}
                    opacity={0.3}
                />
                <Path
                    path={glitchWeb}
                    color={Colors.glitchMagenta}
                    style="stroke"
                    strokeWidth={2}
                    opacity={0.3}
                />
                {/* Main White Web */}
                <Path
                    path={mainWeb}
                    color="white"
                    style="stroke"
                    strokeWidth={1.5}
                    opacity={0.8}
                />
            </Group>
        </Canvas>
    );
}
