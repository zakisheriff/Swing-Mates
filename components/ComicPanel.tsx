import { Colors } from '../constants/Colors';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

interface ComicPanelProps {
    children: React.ReactNode;
    rotate?: string;
    borderColor?: string;
    glowColor?: string;
    showHalftone?: boolean;
    style?: ViewStyle;
    shadowOffset?: { x: number; y: number };
}

export default function ComicPanel({
    children,
    rotate = '-1deg',
    borderColor = 'black',
    glowColor = Colors.glitchCyan,
    showHalftone = false,
    style,
    shadowOffset = { x: 6, y: 6 },
}: ComicPanelProps) {
    return (
        <View style={[styles.container, { transform: [{ rotate }] }, style]}>
            {/* Deep shadow layer */}
            <View
                style={[
                    styles.shadow,
                    {
                        backgroundColor: 'black',
                        transform: [{ translateX: shadowOffset.x }, { translateY: shadowOffset.y }],
                    },
                ]}
            />

            {/* Color glow layer */}
            <View
                style={[
                    styles.shadow,
                    {
                        backgroundColor: glowColor,
                        transform: [{ translateX: shadowOffset.x - 2 }, { translateY: shadowOffset.y - 2 }],
                        opacity: 0.7,
                    },
                ]}
            />

            {/* Main panel */}
            <View style={[styles.panel, { borderColor }]}>
                {/* Halftone background */}
                {showHalftone && (
                    <View style={styles.halftoneContainer}>
                        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                            <Defs>
                                <Pattern id="halftone" patternUnits="userSpaceOnUse" width="8" height="8">
                                    <Circle cx="4" cy="4" r="1.5" fill="black" opacity="0.05" />
                                </Pattern>
                            </Defs>
                            <Rect x="0" y="0" width="100%" height="100%" fill="url(#halftone)" />
                        </Svg>
                    </View>
                )}

                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    shadow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 2,
    },
    panel: {
        backgroundColor: 'white',
        borderWidth: 4,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    halftoneContainer: {
        ...StyleSheet.absoluteFillObject,
    },
});
