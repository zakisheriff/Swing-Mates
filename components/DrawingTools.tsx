import * as Haptics from 'expo-haptics';
import {
    Circle,
    Minus,
    PaintBucket,
    Pen,
    Pencil,
    Slash,
    Square,
    Triangle,
    X
} from 'lucide-react-native';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============ TOOL TYPES ============

export type BrushType = 'pen' | 'marker' | 'calligraphy';
export type ShapeType = 'line' | 'rectangle' | 'circle' | 'triangle';
export type ToolType = 'brush' | 'shape' | 'eraser' | 'fill';

export interface ToolSettings {
    currentTool: ToolType;
    brushType: BrushType;
    shapeType: ShapeType;
    brushSize: number;
    brushOpacity: number;
    eraserSize: number;
}

// ============ BRUSH CONFIGS ============

export const BRUSH_CONFIGS: Record<BrushType, {
    name: string;
    strokeCap: 'round' | 'butt' | 'square';
    strokeJoin: 'round' | 'bevel' | 'miter';
    opacity: number;
    description: string;
}> = {
    pen: {
        name: 'Pen',
        strokeCap: 'round',
        strokeJoin: 'round',
        opacity: 1.0,
        description: 'Solid, smooth strokes',
    },
    marker: {
        name: 'Marker',
        strokeCap: 'square',
        strokeJoin: 'bevel',
        opacity: 0.7,
        description: 'Semi-transparent, flat',
    },
    calligraphy: {
        name: 'Calligraphy',
        strokeCap: 'butt',
        strokeJoin: 'miter',
        opacity: 1.0,
        description: 'Variable width strokes',
    },
};

// ============ PROPS ============

interface DrawingToolsProps {
    settings: ToolSettings;
    onSettingsChange: (settings: Partial<ToolSettings>) => void;
    selectedColor: string;
    onClose: () => void;
}

// ============ MAIN COMPONENT ============

export default function DrawingTools({
    settings,
    onSettingsChange,
    selectedColor,
    onClose
}: DrawingToolsProps) {

    const handleToolSelect = (tool: ToolType) => {
        Haptics.selectionAsync();
        onSettingsChange({ currentTool: tool });
    };

    const handleBrushSelect = (brush: BrushType) => {
        Haptics.selectionAsync();
        onSettingsChange({ brushType: brush, currentTool: 'brush' });
    };

    const handleShapeSelect = (shape: ShapeType) => {
        Haptics.selectionAsync();
        onSettingsChange({ shapeType: shape, currentTool: 'shape' });
    };

    const isSmall = Platform.OS === 'android';

    return (
        <View style={styles.container}>
            {/* Header with Close Button */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>DRAWING TOOLS</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <X color="#FF2D95" size={24} />
                </TouchableOpacity>
            </View>

            {/* Main Tool Row */}
            <View style={styles.toolRow}>
                <Text style={styles.sectionLabel}>TOOLS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolScroll}>
                    {/* Brush Tool */}
                    <ToolButton
                        icon={<Pen color="#FFF" size={18} />}
                        label="Brush"
                        isActive={settings.currentTool === 'brush'}
                        onPress={() => handleToolSelect('brush')}
                    />

                    {/* Shape Tool */}
                    <ToolButton
                        icon={<Square color="#FFF" size={18} />}
                        label="Shape"
                        isActive={settings.currentTool === 'shape'}
                        onPress={() => handleToolSelect('shape')}
                    />

                    {/* Fill Tool */}
                    <ToolButton
                        icon={<PaintBucket color="#FFF" size={18} />}
                        label="Fill"
                        isActive={settings.currentTool === 'fill'}
                        onPress={() => handleToolSelect('fill')}
                    />


                </ScrollView>
            </View>

            {/* Brush Types (shown when brush tool selected) */}
            {settings.currentTool === 'brush' && (
                <View style={styles.subToolRow}>
                    <Text style={styles.sectionLabel}>BRUSHES</Text>
                    <View style={styles.brushGrid}>
                        <BrushButton
                            type="pen"
                            isActive={settings.brushType === 'pen'}
                            onPress={() => handleBrushSelect('pen')}
                        />
                        <BrushButton
                            type="marker"
                            isActive={settings.brushType === 'marker'}
                            onPress={() => handleBrushSelect('marker')}
                        />
                        <BrushButton
                            type="calligraphy"
                            isActive={settings.brushType === 'calligraphy'}
                            onPress={() => handleBrushSelect('calligraphy')}
                        />
                    </View>
                </View>
            )}

            {/* Shape Types (shown when shape tool selected) */}
            {settings.currentTool === 'shape' && (
                <View style={styles.subToolRow}>
                    <Text style={styles.sectionLabel}>SHAPES</Text>
                    <View style={styles.shapeGrid}>
                        <ShapeButton
                            type="line"
                            icon={<Slash color="#FFF" size={20} />}
                            isActive={settings.shapeType === 'line'}
                            onPress={() => handleShapeSelect('line')}
                        />
                        <ShapeButton
                            type="rectangle"
                            icon={<Square color="#FFF" size={20} />}
                            isActive={settings.shapeType === 'rectangle'}
                            onPress={() => handleShapeSelect('rectangle')}
                        />
                        <ShapeButton
                            type="circle"
                            icon={<Circle color="#FFF" size={20} />}
                            isActive={settings.shapeType === 'circle'}
                            onPress={() => handleShapeSelect('circle')}
                        />
                        <ShapeButton
                            type="triangle"
                            icon={<Triangle color="#FFF" size={20} />}
                            isActive={settings.shapeType === 'triangle'}
                            onPress={() => handleShapeSelect('triangle')}
                        />
                    </View>
                </View>
            )}

            {/* Size Indicator */}
            <View style={styles.sizeIndicator}>
                <View style={[
                    styles.sizeDot,
                    {
                        width: Math.min(settings.currentTool === 'eraser' ? settings.eraserSize : settings.brushSize, 30),
                        height: Math.min(settings.currentTool === 'eraser' ? settings.eraserSize : settings.brushSize, 30),
                        backgroundColor: settings.currentTool === 'eraser' ? '#888' : selectedColor,
                        opacity: settings.currentTool === 'brush' ? BRUSH_CONFIGS[settings.brushType].opacity : 1,
                    }
                ]} />
            </View>
        </View>
    );
}

// ============ SUB-COMPONENTS ============

function ToolButton({
    icon,
    label,
    isActive,
    onPress
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.toolBtn, isActive && styles.toolBtnActive]}
            onPress={onPress}
        >
            {icon}
            <Text style={[styles.toolLabel, isActive && styles.toolLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

function BrushButton({
    type,
    isActive,
    onPress
}: {
    type: BrushType;
    isActive: boolean;
    onPress: () => void;
}) {
    const config = BRUSH_CONFIGS[type];
    const icons: Record<BrushType, React.ReactNode> = {
        pen: <Pen color="#FFF" size={16} />,
        marker: <Minus color="#FFF" size={16} strokeWidth={4} />,
        calligraphy: <Pencil color="#FFF" size={16} />,
    };

    return (
        <TouchableOpacity
            style={[styles.brushBtn, isActive && styles.brushBtnActive]}
            onPress={onPress}
        >
            {icons[type]}
            <Text style={styles.brushLabel}>{config.name}</Text>
        </TouchableOpacity>
    );
}

function ShapeButton({
    type,
    icon,
    isActive,
    onPress
}: {
    type: ShapeType;
    icon: React.ReactNode;
    isActive: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.shapeBtn, isActive && styles.shapeBtnActive]}
            onPress={onPress}
        >
            {icon}
        </TouchableOpacity>
    );
}

// ============ STYLES ============

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0A0A12',
        borderRadius: 12,
        padding: 10,
        margin: 8,
        borderWidth: 2,
        borderColor: '#00D4FF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 212, 255, 0.3)',
    },
    headerTitle: {
        color: '#00D4FF',
        fontFamily: 'Bangers_400Regular',
        fontSize: 18,
        letterSpacing: 2,
    },
    closeBtn: {
        padding: 4,
    },
    toolRow: {
        marginBottom: 8,
    },
    subToolRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 212, 255, 0.3)',
    },
    sectionLabel: {
        color: '#888',
        fontSize: 10,
        fontFamily: 'Bangers_400Regular',
        letterSpacing: 2,
        marginBottom: 6,
    },
    toolScroll: {
        flexDirection: 'row',
    },
    toolBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: '#1A1A2E',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        minWidth: 60,
    },
    toolBtnActive: {
        backgroundColor: '#00D4FF',
        borderColor: '#00D4FF',
    },
    toolLabel: {
        color: '#888',
        fontSize: 10,
        marginTop: 4,
        fontFamily: 'Inter_400Regular',
    },
    toolLabelActive: {
        color: '#000',
        fontWeight: 'bold',
    },
    brushGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    brushBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#1A1A2E',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        minWidth: 70,
    },
    brushBtnActive: {
        backgroundColor: '#FF2D95',
        borderColor: '#FF2D95',
    },
    brushLabel: {
        color: '#FFF',
        fontSize: 10,
        marginTop: 4,
    },
    shapeGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    shapeBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#1A1A2E',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    shapeBtnActive: {
        backgroundColor: '#00D4FF',
        borderColor: '#00D4FF',
    },
    sizeIndicator: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        height: 36,
    },
    sizeDot: {
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
});
