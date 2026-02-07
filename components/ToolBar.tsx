import * as Haptics from 'expo-haptics';
import { Download, Eraser, Image, Minus, Palette, Plus, Redo2, Trash2, Undo2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import SafeColorPicker from './SafeColorPicker';

interface ToolBarProps {
    selectedColor: string;
    onSelectColor: (color: string) => void;
    strokeWidth: number;
    onSelectStrokeWidth: (width: number) => void;
    onClear: () => void;
    onUndo: () => void;
    onRedo: () => void;
    isEyedropperActive: boolean;
    onToggleEyedropper: () => void;
    onExport?: () => void;
    onToggleReferenceImage?: () => void;
    isReferenceImageActive?: boolean;
    onToggleTools?: () => void;
    isToolsActive?: boolean;
}

// Comic-style tool button with haptics
function ToolButton({
    onPress,
    isActive,
    children,
    color = '#00D4FF'
}: {
    onPress: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    color?: string;
}) {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <TouchableOpacity
            style={[
                styles.toolBtn,
                isActive && [styles.activeToolBtn, { borderColor: color }],
            ]}
            onPress={handlePress}
        >
            {/* 3D shadow effect */}
            <View style={[styles.toolBtnShadow, isActive && { backgroundColor: color }]} />
            <View style={styles.toolBtnContent}>
                {children}
            </View>
        </TouchableOpacity>
    );
}

// Color swatch with comic styling
function ColorSwatch({
    color,
    isSelected,
    onPress
}: {
    color: string;
    isSelected: boolean;
    onPress: () => void;
}) {
    const isWhite = color.toLowerCase() === '#ffffff';

    return (
        <TouchableOpacity
            style={[
                styles.colorSwatch,
                { backgroundColor: color },
                isSelected && styles.selectedSwatch,
            ]}
            onPress={onPress}
        >
            {/* Inner shadow for selected state */}
            {isSelected && <View style={styles.swatchInner} />}
            {isWhite && <Eraser color="black" size={18} />}
        </TouchableOpacity>
    );
}

export default function ToolBar({
    selectedColor,
    onSelectColor,
    strokeWidth,
    onSelectStrokeWidth,
    onClear,
    onUndo,
    onRedo,
    isEyedropperActive,
    onToggleEyedropper,
    onExport,
    onToggleReferenceImage,
    isReferenceImageActive,
    onToggleTools,
    isToolsActive
}: ToolBarProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const palette = [
        Colors.spiderRed,
        Colors.spiderBlue,
        Colors.spiderBlack,
        Colors.spiderYellow,
        Colors.spiderViolet,
        Colors.spiderGreen,
        Colors.glitchMagenta,
        '#FFFFFF',
    ];

    return (
        <View style={styles.container}>
            {/* Header accent line */}
            <View style={styles.headerAccent}>
                <View style={[styles.accentSegment, { backgroundColor: Colors.spiderRed }]} />
                <View style={[styles.accentSegment, { backgroundColor: Colors.spiderBlue }]} />
                <View style={[styles.accentSegment, { backgroundColor: Colors.spiderYellow }]} />
            </View>

            {/* Tools Row - Scrollable */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolsScrollContent}
                style={styles.toolsScrollView}
            >
                <ToolButton onPress={onUndo}>
                    <Undo2 color="white" size={20} />
                </ToolButton>

                <ToolButton onPress={onRedo}>
                    <Redo2 color="white" size={20} />
                </ToolButton>


                {/* Stroke width control */}
                <View style={styles.strokeControl}>
                    <TouchableOpacity
                        style={styles.strokeBtn}
                        onPress={() => onSelectStrokeWidth(Math.max(2, strokeWidth - 3))}
                    >
                        <Minus color="white" size={16} />
                    </TouchableOpacity>
                    <View style={styles.strokePreview}>
                        <View style={[styles.strokeDot, {
                            width: Math.min(strokeWidth * 1.5, 24),
                            height: Math.min(strokeWidth * 1.5, 24),
                            backgroundColor: selectedColor,
                        }]} />
                    </View>
                    <TouchableOpacity
                        style={styles.strokeBtn}
                        onPress={() => onSelectStrokeWidth(Math.min(30, strokeWidth + 3))}
                    >
                        <Plus color="white" size={16} />
                    </TouchableOpacity>
                </View>

                <ToolButton onPress={onClear} color={Colors.actionRed || Colors.spiderRed}>
                    <Trash2 color="white" size={20} />
                </ToolButton>

                {onToggleReferenceImage && (
                    <ToolButton
                        onPress={onToggleReferenceImage}
                        isActive={isReferenceImageActive}
                        color={Colors.spiderViolet}
                    >
                        <Image color="white" size={20} />
                    </ToolButton>
                )}

                {onToggleTools && (
                    <ToolButton
                        onPress={onToggleTools}
                        isActive={isToolsActive}
                        color={Colors.spiderViolet || '#9B59B6'}
                    >
                        <Palette color="white" size={20} />
                    </ToolButton>
                )}

                {onExport && (
                    <ToolButton onPress={onExport} color={Colors.spiderBlue}>
                        <Download color="white" size={20} />
                    </ToolButton>
                )}
            </ScrollView>

            {/* Colors Row */}
            <View style={styles.colorSection}>
                <Text style={styles.sectionLabel}>COLORS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                    {palette.map((c) => (
                        <ColorSwatch
                            key={c}
                            color={c}
                            isSelected={selectedColor === c}
                            onPress={() => onSelectColor(c)}
                        />
                    ))}
                    {/* Custom color button */}
                    <TouchableOpacity
                        style={[styles.customColorBtn, { backgroundColor: selectedColor }]}
                        onPress={() => setShowColorPicker(true)}
                    >
                        <Plus color={selectedColor.toLowerCase() === '#ffffff' ? 'black' : 'white'} size={22} />
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Color Picker Modal */}
            <Modal
                visible={showColorPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowColorPicker(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior="padding"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.pickerContent}>
                        <Text style={styles.pickerTitle}>PICK YOUR COLOR!</Text>
                        <SafeColorPicker
                            selectedColor={selectedColor}
                            onSelectColor={onSelectColor}
                            onClose={() => setShowColorPicker(false)}
                            onActivateEyedropper={() => {
                                setShowColorPicker(false);
                                onToggleEyedropper();
                            }}
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.spiderBlack,
        paddingBottom: 30,
        width: '100%',
        zIndex: 2000,
        elevation: 20,
        borderTopWidth: 4,
        borderTopColor: '#FF2D95',
        shadowColor: '#00D4FF',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    headerAccent: {
        flexDirection: 'row',
        height: 4,
    },
    accentSegment: {
        flex: 1,
    },
    toolsScrollView: {
        maxHeight: 70,
    },
    toolsScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        gap: 10,
    },
    toolsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 8,
    },
    toolBtn: {
        width: 46,
        height: 46,
        position: 'relative',
    },
    toolBtnShadow: {
        position: 'absolute',
        top: 3,
        left: 3,
        right: -3,
        bottom: -3,
        backgroundColor: '#FF2D95',
        borderRadius: 4,
    },
    toolBtnContent: {
        flex: 1,
        backgroundColor: '#0A0A12',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#00D4FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeToolBtn: {
        transform: [{ scale: 1.1 }, { rotate: '-3deg' }],
    },
    strokeControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A0A12',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#00D4FF',
        paddingHorizontal: 6,
        height: 46,
    },
    strokeBtn: {
        padding: 6,
    },
    strokePreview: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    strokeDot: {
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    colorSection: {
        paddingHorizontal: 15,
    },
    sectionLabel: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 8,
        letterSpacing: 2,
    },
    colorRow: {
        flexDirection: 'row',
    },
    colorSwatch: {
        width: 44,
        height: 44,
        borderRadius: 4,
        marginRight: 10,
        borderWidth: 3,
        borderColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'black',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    selectedSwatch: {
        borderColor: 'white',
        transform: [{ scale: 1.1 }, { rotate: '-3deg' }],
    },
    swatchInner: {
        position: 'absolute',
        width: 10,
        height: 10,
        backgroundColor: 'white',
        borderRadius: 5,
    },
    customColorBtn: {
        width: 44,
        height: 44,
        borderRadius: 4,
        borderWidth: 3,
        borderColor: 'white',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    pickerContent: {
        width: '85%',
        maxHeight: '70%',
        backgroundColor: '#222',
        padding: 20,
        borderRadius: 4,
        borderWidth: 5,
        borderColor: Colors.spiderRed,
        shadowColor: Colors.spiderBlue,
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    pickerScrollContent: {
        alignItems: 'center',
        paddingBottom: 10,
    },
    pickerTitle: {
        fontFamily: 'Bangers_400Regular',
        fontSize: 24,
        color: '#00D4FF',
        textAlign: 'center',
        marginBottom: 15,
        textShadowColor: '#FF2D95',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 0,
    },
});
