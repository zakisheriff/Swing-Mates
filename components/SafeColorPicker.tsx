import { LinearGradient } from 'expo-linear-gradient';
import { Pipette } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SafeColorPickerProps {
    selectedColor: string;
    onSelectColor: (color: string) => void;
    onClose: () => void;
    onActivateEyedropper?: () => void;
}

// Dimensions
const PICKER_SIZE = Platform.OS === 'android' ? Math.min(SCREEN_WIDTH - 100, 220) : Math.min(SCREEN_WIDTH - 80, 280);
const HUE_SLIDER_HEIGHT = 32;
const CURSOR_SIZE = 22;

// ============ COLOR CONVERSION UTILITIES ============

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    h = h / 360;
    s = s / 100;
    v = v / 100;

    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hueToColor(hue: number): string {
    const [r, g, b] = hsvToRgb(hue, 100, 100);
    return rgbToHex(r, g, b);
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

// ============ MAIN COMPONENT ============

export default function SafeColorPicker({
    selectedColor,
    onSelectColor,
    onClose,
    onActivateEyedropper
}: SafeColorPickerProps) {
    // HSV State
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [brightness, setBrightness] = useState(100);

    // Derived values
    const [rgb, setRgb] = useState<[number, number, number]>([255, 0, 0]);
    const [hex, setHex] = useState('#FF0000');
    const [hsl, setHsl] = useState<[number, number, number]>([0, 100, 50]);

    // Track if we've initialized from selectedColor
    const hasInitialized = useRef(false);

    // Initialize from selectedColor on mount
    React.useEffect(() => {
        if (!hasInitialized.current && selectedColor) {
            hasInitialized.current = true;
            const [r, g, b] = hexToRgb(selectedColor);
            const [h, s, v] = rgbToHsv(r, g, b);
            setHue(h);
            setSaturation(s);
            setBrightness(v);
            setRgb([r, g, b]);
            setHex(selectedColor.toUpperCase());
            setHsl(rgbToHsl(r, g, b));
        }
    }, [selectedColor]);

    // Refs for touch handling
    const squareRef = useRef<View>(null);
    const hueRef = useRef<View>(null);
    const lastUpdateTime = useRef(0);
    const UPDATE_THROTTLE = 0; // 60fps for both platforms

    // Layout positions for accurate touch calculation (Android fix)
    const squareLayout = useRef({ x: 0, y: 0 });
    const hueLayout = useRef({ x: 0, y: 0 });

    // Update all color values from HSV
    const updateColors = (h: number, s: number, v: number) => {
        const newRgb = hsvToRgb(h, s, v);
        const newHex = rgbToHex(...newRgb);
        const newHsl = rgbToHsl(...newRgb);

        setRgb(newRgb);
        setHex(newHex);
        setHsl(newHsl);
        onSelectColor(newHex);
    };

    // Handle square touch (Saturation/Brightness) - throttled
    const handleSquareTouch = (x: number, y: number, forceUpdate = false) => {
        const now = Date.now();
        if (!forceUpdate && now - lastUpdateTime.current < UPDATE_THROTTLE) return;
        lastUpdateTime.current = now;

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(PICKER_SIZE, x));
        const clampedY = Math.max(0, Math.min(PICKER_SIZE, y));

        const newSat = (clampedX / PICKER_SIZE) * 100;
        const newBright = 100 - (clampedY / PICKER_SIZE) * 100;

        setSaturation(newSat);
        setBrightness(newBright);
        updateColors(hue, newSat, newBright);
    };

    // Handle hue slider touch - throttled
    const handleHueTouch = (x: number, forceUpdate = false) => {
        const now = Date.now();
        if (!forceUpdate && now - lastUpdateTime.current < UPDATE_THROTTLE) return;
        lastUpdateTime.current = now;

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(PICKER_SIZE, x));
        const newHue = (clampedX / PICKER_SIZE) * 360;

        setHue(newHue);
        updateColors(newHue, saturation, brightness);
    };

    // Measure layout on mount
    const onSquareLayout = () => {
        squareRef.current?.measureInWindow((x, y) => {
            squareLayout.current = { x, y };
        });
    };

    const onHueLayout = () => {
        hueRef.current?.measureInWindow((x, y) => {
            hueLayout.current = { x, y };
        });
    };

    // Create robust touch handlers using pageX/pageY (works better on Android)
    const createSquareTouchHandler = () => ({
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: any) => {
            const { pageX, pageY } = e.nativeEvent;
            const x = pageX - squareLayout.current.x;
            const y = pageY - squareLayout.current.y;
            handleSquareTouch(x, y, true);
        },
        onResponderMove: (e: any) => {
            const { pageX, pageY } = e.nativeEvent;
            const x = pageX - squareLayout.current.x;
            const y = pageY - squareLayout.current.y;
            handleSquareTouch(x, y);
        },
        onResponderRelease: (e: any) => {
            const { pageX, pageY } = e.nativeEvent;
            const x = pageX - squareLayout.current.x;
            const y = pageY - squareLayout.current.y;
            handleSquareTouch(x, y, true);
        },
    });

    const createHueTouchHandler = () => ({
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: any) => {
            const { pageX } = e.nativeEvent;
            const x = pageX - hueLayout.current.x;
            handleHueTouch(x, true);
        },
        onResponderMove: (e: any) => {
            const { pageX } = e.nativeEvent;
            const x = pageX - hueLayout.current.x;
            handleHueTouch(x);
        },
        onResponderRelease: (e: any) => {
            const { pageX } = e.nativeEvent;
            const x = pageX - hueLayout.current.x;
            handleHueTouch(x, true);
        },
    });

    // Eyedropper handler
    const handleEyedropper = () => {
        onClose();
        if (onActivateEyedropper) {
            onActivateEyedropper();
        }
    };

    // Current pure hue color for square gradient
    const pureHueColor = hueToColor(hue);

    return (
        <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.container}>
                {/* 2D Color Square - Saturation (X) / Brightness (Y) */}
                <View
                    ref={squareRef}
                    style={[styles.colorSquare, { width: PICKER_SIZE, height: PICKER_SIZE }]}
                    onLayout={onSquareLayout}
                    {...createSquareTouchHandler()}
                >
                    {/* Base Hue Layer */}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: pureHueColor }]} />

                    {/* White to Transparent (Saturation - Left to Right) */}
                    <LinearGradient
                        colors={['#FFFFFF', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Transparent to Black (Brightness - Top to Bottom) */}
                    <LinearGradient
                        colors={['transparent', '#000000']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Cursor */}
                    <View
                        style={[
                            styles.squareCursor,
                            {
                                left: (saturation / 100) * PICKER_SIZE - CURSOR_SIZE / 2,
                                top: ((100 - brightness) / 100) * PICKER_SIZE - CURSOR_SIZE / 2,
                            }
                        ]}
                    >
                        <View style={[styles.cursorInner, { backgroundColor: hex }]} />
                    </View>
                </View>

                {/* Hue Slider */}
                <View
                    ref={hueRef}
                    style={[styles.hueSlider, { width: PICKER_SIZE }]}
                    onLayout={onHueLayout}
                    {...createHueTouchHandler()}
                >
                    <LinearGradient
                        colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.hueGradient}
                    />
                    {/* Hue Cursor */}
                    <View
                        style={[
                            styles.hueCursor,
                            { left: Math.max(0, Math.min(PICKER_SIZE - 12, (hue / 360) * PICKER_SIZE - 6)) }
                        ]}
                    />
                </View>

                {/* Color Info Row */}
                <View style={styles.infoRow}>
                    {/* Color Preview */}
                    <View style={[styles.preview, { backgroundColor: hex }]} />

                    {/* HEX Input */}
                    <TextInput
                        style={styles.hexInput}
                        value={hex}
                        onChangeText={(text) => {
                            // Always update the display text
                            let formatted = text.toUpperCase();
                            if (!formatted.startsWith('#')) {
                                formatted = '#' + formatted;
                            }
                            // Limit to 7 chars (#XXXXXX)
                            formatted = formatted.slice(0, 7);
                            setHex(formatted);

                            // Only apply color if valid hex
                            if (/^#[0-9A-F]{6}$/i.test(formatted)) {
                                const [r, g, b] = hexToRgb(formatted);
                                setRgb([r, g, b]);
                                setHsl(rgbToHsl(r, g, b));
                                onSelectColor(formatted);
                            }
                        }}
                        maxLength={7}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        keyboardType="default"
                    />

                    {/* Eyedropper */}
                    {onActivateEyedropper && (
                        <TouchableOpacity style={styles.eyedropperBtn} onPress={handleEyedropper}>
                            <Pipette color="#00D4FF" size={20} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Color Values Display */}
                <View style={styles.valuesRow}>
                    <Text style={styles.valueText}>RGB({rgb[0]}, {rgb[1]}, {rgb[2]})</Text>
                    <Text style={styles.valueText}>HSL({hsl[0]}°, {hsl[1]}%, {hsl[2]}%)</Text>
                </View>

                {/* Done Button */}
                <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                    <Text style={styles.btnText}>DONE</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
    container: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    colorSquare: {
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#00D4FF',
        overflow: 'hidden',
        position: 'relative',
    },
    squareCursor: {
        position: 'absolute',
        width: CURSOR_SIZE,
        height: CURSOR_SIZE,
        borderRadius: CURSOR_SIZE / 2,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5,
    },
    cursorInner: {
        width: CURSOR_SIZE - 6,
        height: CURSOR_SIZE - 6,
        borderRadius: (CURSOR_SIZE - 6) / 2,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.5)',
    },
    hueSlider: {
        height: HUE_SLIDER_HEIGHT,
        borderRadius: 10,
        marginTop: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#00D4FF',
        position: 'relative',
    },
    hueGradient: {
        width: '100%',
        height: '100%',
    },
    hueCursor: {
        position: 'absolute',
        width: 12,
        height: HUE_SLIDER_HEIGHT,
        backgroundColor: 'white',
        borderRadius: 3,
        borderWidth: 2,
        borderColor: '#333',
        top: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    preview: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: '#00D4FF',
    },
    hexInput: {
        backgroundColor: '#1A1A2E',
        borderWidth: 2,
        borderColor: '#00D4FF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: '#FFFFFF',
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        minWidth: 100,
        textAlign: 'center',
    },
    eyedropperBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1A1A2E',
        borderWidth: 2,
        borderColor: '#00D4FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    valuesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    valuesContainer: {
        marginTop: 6,
    },
    valueText: {
        color: '#888',
        fontFamily: 'Inter_400Regular',
        fontSize: 10,
        textAlign: 'center',
    },
    doneBtn: {
        marginTop: 8,
        backgroundColor: '#FF2D95',
        paddingHorizontal: 32,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'white',
    },
    btnText: {
        fontFamily: 'Bangers_400Regular',
        color: 'white',
        fontSize: 18,
        letterSpacing: 2,
    },
});
