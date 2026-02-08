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
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface DimensionGlitchOverlayProps {
    intensity?: 'subtle' | 'medium' | 'aggressive';
    enabled?: boolean;
}

interface GlitchSlice {
    id: number;
    top: number;
    height: number;
    offsetX: number;
    color: string;
    opacity: number;
}

// Individual animated glitch slice
function GlitchSliceComponent({ slice }: { slice: GlitchSlice }) {
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        const startDelay = Math.random() * 5000;

        translateX.value = withDelay(
            startDelay,
            withRepeat(
                withSequence(
                    withTiming(0, { duration: 0 }),
                    withTiming(slice.offsetX, { duration: 30, easing: Easing.linear }),
                    withTiming(-slice.offsetX * 0.5, { duration: 20, easing: Easing.linear }),
                    withTiming(0, { duration: 50, easing: Easing.out(Easing.cubic) }),
                    withDelay(3000 + Math.random() * 4000, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            )
        );

        opacity.value = withDelay(
            startDelay,
            withRepeat(
                withSequence(
                    withTiming(slice.opacity, { duration: 10 }),
                    withDelay(100, withTiming(0, { duration: 50 })),
                    withDelay(3000 + Math.random() * 4000, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.glitchSlice,
                {
                    top: slice.top,
                    height: slice.height,
                    backgroundColor: slice.color,
                },
                animatedStyle,
            ]}
        />
    );
}

// Scan line that moves vertically
function ScanLine() {
    const translateY = useSharedValue(-10);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 0 }),
                withDelay(2000, withTiming(height + 10, { duration: 800, easing: Easing.linear })),
                withDelay(5000, withTiming(-10, { duration: 0 }))
            ),
            -1,
            false
        );

        opacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 0 }),
                withDelay(2000, withTiming(0.3, { duration: 100 })),
                withDelay(700, withTiming(0, { duration: 100 })),
                withDelay(5000, withTiming(0, { duration: 0 }))
            ),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={[styles.scanLine, animatedStyle]} />;
}

// Screen tear effect
function ScreenTear() {
    const offset = useSharedValue(0);
    const opacity = useSharedValue(0);
    const tearY = useSharedValue(height * 0.5);

    useEffect(() => {
        const triggerTear = () => {
            tearY.value = Math.random() * height;
        };

        offset.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 0 }),
                withDelay(8000 + Math.random() * 5000,
                    withSequence(
                        withTiming(20, { duration: 30 }),
                        withTiming(-10, { duration: 20 }),
                        withTiming(0, { duration: 50 })
                    )
                )
            ),
            -1,
            false
        );

        opacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 0 }),
                withDelay(8000 + Math.random() * 5000,
                    withSequence(
                        withTiming(1, { duration: 10 }),
                        withDelay(100, withTiming(0, { duration: 30 }))
                    )
                )
            ),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }],
        opacity: opacity.value,
        top: tearY.value,
    }));

    return <Animated.View style={[styles.screenTear, animatedStyle]} />;
}

// RGB Split overlay - chromatic aberration on the whole screen
function ChromaticAberration({ intensity }: { intensity: number }) {
    const offsetX = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        offsetX.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 0 }),
                withDelay(10000 + Math.random() * 5000,
                    withSequence(
                        withTiming(intensity * 3, { duration: 20 }),
                        withTiming(-intensity * 2, { duration: 30 }),
                        withTiming(0, { duration: 100 })
                    )
                )
            ),
            -1,
            false
        );

        opacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 0 }),
                withDelay(10000 + Math.random() * 5000,
                    withSequence(
                        withTiming(0.15, { duration: 10 }),
                        withDelay(150, withTiming(0, { duration: 50 }))
                    )
                )
            ),
            -1,
            false
        );
    }, [intensity]);

    const cyanStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -offsetX.value }],
        opacity: opacity.value,
    }));

    const magentaStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offsetX.value }],
        opacity: opacity.value,
    }));

    return (
        <>
            <Animated.View style={[styles.chromaLayer, { backgroundColor: Colors.glitchCyan }, cyanStyle]} />
            <Animated.View style={[styles.chromaLayer, { backgroundColor: Colors.glitchMagenta }, magentaStyle]} />
        </>
    );
}

export default function DimensionGlitchOverlay({
    intensity = 'subtle',
    enabled = true
}: DimensionGlitchOverlayProps) {
    if (!enabled) return null;

    const intensityMultiplier = intensity === 'aggressive' ? 3 : intensity === 'medium' ? 2 : 1;
    const sliceCount = intensity === 'aggressive' ? 8 : intensity === 'medium' ? 5 : 3;

    // Generate random glitch slices
    const glitchSlices: GlitchSlice[] = React.useMemo(() => {
        return Array.from({ length: sliceCount }, (_, i) => ({
            id: i,
            top: Math.random() * height,
            height: 2 + Math.random() * 8 * intensityMultiplier,
            offsetX: (10 + Math.random() * 20) * intensityMultiplier * (Math.random() > 0.5 ? 1 : -1),
            color: [Colors.glitchCyan, Colors.glitchMagenta, Colors.spiderRed][Math.floor(Math.random() * 3)],
            opacity: 0.3 + Math.random() * 0.4,
        }));
    }, [intensity]);

    return (
        <View style={styles.container} pointerEvents="none">
            {/* Horizontal scan lines (static pattern) */}
            {intensity !== 'subtle' && (
                <View style={styles.scanLinesContainer}>
                    {Array.from({ length: Math.floor(height / 4) }, (_, i) => (
                        <View key={i} style={styles.staticScanLine} />
                    ))}
                </View>
            )}

            {/* Moving scan line */}
            <ScanLine />

            {/* Random glitch slices */}
            {glitchSlices.map(slice => (
                <GlitchSliceComponent key={slice.id} slice={slice} />
            ))}

            {/* Screen tear effect */}
            <ScreenTear />

            {/* Chromatic aberration overlay */}
            <ChromaticAberration intensity={intensityMultiplier} />

            {/* Noise overlay */}
            <View style={styles.noiseOverlay} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9998,
        overflow: 'hidden',
    },
    glitchSlice: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    scanLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    scanLinesContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.03,
    },
    staticScanLine: {
        height: 1,
        backgroundColor: 'white',
        marginBottom: 3,
    },
    screenTear: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: 'transparent',
        borderTopWidth: 2,
        borderTopColor: Colors.glitchCyan,
        borderBottomWidth: 2,
        borderBottomColor: Colors.glitchMagenta,
    },
    chromaLayer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0,
    },
    noiseOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        // Static noise effect simulated via opacity flicker would go here
        // In production, could use an actual noise image
    },
});
