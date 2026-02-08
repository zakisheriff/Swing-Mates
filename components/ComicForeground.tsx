import { Colors } from '../constants/Colors';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import ComicBoom from './ComicBoom';

const { width, height } = Dimensions.get('window');

export default function ComicForeground() {
    // Static ambient words - Positioned to overlay
    // Static ambient words - Positioned to overlay
    const AMBIENT_WORDS = [
        { word: 'THWIP!', x: width * 0.05, y: height * 0.12, color: Colors.spiderRed, rotate: -15, size: 30, delay: 0, shape: 'burst' as const },
        { word: '42', x: width * 0.8, y: height * 0.1, color: Colors.spiderYellow, rotate: 10, size: 40, delay: 4000, shape: 'star' as const },
        { word: 'GLITCH', x: width * 0.05, y: height * 0.85, color: Colors.spiderBlue, rotate: -5, size: 35, delay: 8000, shape: 'jagged' as const },
        { word: 'POV', x: width * 0.8, y: height * 0.25, color: Colors.glitchMagenta, rotate: 20, size: 25, delay: 2000, shape: 'cloud' as const },
        { word: 'SNAP', x: width * 0.1, y: height * 0.25, color: Colors.spiderGreen, rotate: -25, size: 30, delay: 6000, shape: 'explosion' as const },
        { word: 'BOOM', x: width * 0.65, y: height * 0.88, color: Colors.spiderRed, rotate: 5, size: 45, delay: 10000, shape: 'burst' as const },
    ];

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]} pointerEvents="none">
            {AMBIENT_WORDS.map((item, i) => (
                <ComicBoom
                    key={i}
                    {...item}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({});
