import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import * as ExpoMediaLibrary from 'expo-media-library';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';
import socketService from '../services/socket';

// Fixed virtual canvas size for cross-device coordinate normalization
const VIRTUAL_WIDTH = 1000;
const VIRTUAL_HEIGHT = 1000;

// Brush configuration type
export interface BrushConfig {
    strokeCap: 'round' | 'butt' | 'square';
    strokeJoin: 'round' | 'bevel' | 'miter';
    opacity: number;
}

// Default brush config (pen)
const DEFAULT_BRUSH_CONFIG: BrushConfig = {
    strokeCap: 'round',
    strokeJoin: 'round',
    opacity: 1.0,
};

interface Stroke {
    path: SkPath;
    color: string;
    strokeWidth: number;
    userId?: string;
    isEraser?: boolean;
    brushConfig?: BrushConfig;
    fillColor?: string; // For filled shapes
}

export interface CanvasRef {
    undo: () => void;
    redo: () => void;
    toggleEyedropper: () => void;
    isEyedropperActive: boolean;
    clear: () => void;
    exportCanvas: () => Promise<string | null>;
    historyCount: number;
    redoCount: number;
}

// Shape types
export type ShapeMode = 'none' | 'line' | 'rectangle' | 'circle' | 'triangle';

interface CanvasProps {
    roomId: string;
    color: string;
    strokeWidth: number;
    userId: string;
    isEraser?: boolean;
    brushConfig?: BrushConfig;
    shapeMode?: ShapeMode;
    isFillMode?: boolean;
    onColorPicked?: (color: string) => void;
}

const DrawingCanvas = forwardRef<CanvasRef, CanvasProps>(({ roomId, color, strokeWidth, userId, isEraser = false, brushConfig = DEFAULT_BRUSH_CONFIG, shapeMode = 'none', isFillMode = false, onColorPicked }, ref) => {
    const [paths, setPaths] = useState<Stroke[]>([]);
    const [redoStack, setRedoStack] = useState<Stroke[]>([]);
    const [currentPathState, setCurrentPathState] = useState<SkPath | null>(null);
    const [isEyedropperActive, setIsEyedropperActive] = useState(false);
    const [remotePaths, setRemotePaths] = useState<Record<string, { path: SkPath, color: string, strokeWidth: number, isEraser?: boolean }>>({});

    // Canvas dimensions
    const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    // Refs
    const containerRef = useRef<View>(null);
    const canvasWrapperRef = useRef<View>(null); // Ref for canvas-only capture
    const currentPath = useRef<SkPath | null>(null);
    const colorRef = useRef(color);
    const strokeWidthRef = useRef(strokeWidth);
    const isEyedropperActiveRef = useRef(isEyedropperActive);
    const isEraserRef = useRef(isEraser);
    const brushConfigRef = useRef(brushConfig);
    const pathsRef = useRef(paths);
    const canvasSizeRef = useRef(canvasSize);
    const lastValidPosition = useRef<{ x: number; y: number } | null>(null);
    const previousPoint = useRef<{ x: number; y: number } | null>(null);
    const shapeStartPoint = useRef<{ x: number; y: number } | null>(null);
    const shapeModeRef = useRef(shapeMode);
    const isFillModeRef = useRef(isFillMode);

    // Maximum allowed distance between consecutive points (to detect jumps)
    const MAX_JUMP_DISTANCE = 80;

    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
    useEffect(() => { isEyedropperActiveRef.current = isEyedropperActive; }, [isEyedropperActive]);
    useEffect(() => { isEraserRef.current = isEraser; }, [isEraser]);
    useEffect(() => { brushConfigRef.current = brushConfig; }, [brushConfig]);
    useEffect(() => { shapeModeRef.current = shapeMode; }, [shapeMode]);
    useEffect(() => { isFillModeRef.current = isFillMode; }, [isFillMode]);
    useEffect(() => { pathsRef.current = paths; }, [paths]);
    useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);

    // Shape path creation utilities
    const createShapePath = (start: { x: number; y: number }, end: { x: number; y: number }, mode: ShapeMode): SkPath | null => {
        const path = Skia.Path.Make();

        switch (mode) {
            case 'line':
                path.moveTo(start.x, start.y);
                path.lineTo(end.x, end.y);
                break;
            case 'rectangle':
                path.moveTo(start.x, start.y);
                path.lineTo(end.x, start.y);
                path.lineTo(end.x, end.y);
                path.lineTo(start.x, end.y);
                path.close();
                break;
            case 'circle': {
                const centerX = (start.x + end.x) / 2;
                const centerY = (start.y + end.y) / 2;
                const radiusX = Math.abs(end.x - start.x) / 2;
                const radiusY = Math.abs(end.y - start.y) / 2;
                path.addOval({ x: centerX - radiusX, y: centerY - radiusY, width: radiusX * 2, height: radiusY * 2 });
                break;
            }
            case 'triangle': {
                const midTopX = (start.x + end.x) / 2;
                path.moveTo(midTopX, start.y);
                path.lineTo(end.x, end.y);
                path.lineTo(start.x, end.y);
                path.close();
                break;
            }
            default:
                return null;
        }

        return path;
    };

    // Scale SVG path string from normalized to local
    const scalePathToLocal = (svgPath: string): SkPath | null => {
        if (!svgPath) return null;
        const { width, height } = canvasSizeRef.current;
        if (width <= 1 || height <= 1) {
            return Skia.Path.MakeFromSVGString(svgPath);
        }

        const path = Skia.Path.MakeFromSVGString(svgPath);
        if (!path) return null;

        const matrix = Skia.Matrix();
        matrix.scale(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
        path.transform(matrix);

        return path;
    };

    // Scale SVG path string from local to normalized
    const scalePathToNormalized = (localPath: SkPath): string => {
        const { width, height } = canvasSizeRef.current;
        const scaleX = VIRTUAL_WIDTH / width;
        const scaleY = VIRTUAL_HEIGHT / height;

        const pathCopy = localPath.copy();
        const matrix = Skia.Matrix();
        matrix.scale(scaleX, scaleY);
        pathCopy.transform(matrix);

        return pathCopy.toSVGString();
    };

    useImperativeHandle(ref, () => ({
        undo: () => {
            setPaths(prev => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                setRedoStack(s => [...s, last]);
                socketService.emit('undo-stroke', { roomId });
                return prev.slice(0, -1);
            });
        },
        redo: () => {
            setRedoStack(prev => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                setPaths(p => [...p, last]);
                const normalizedPath = scalePathToNormalized(last.path);
                socketService.emit('draw-stroke', {
                    roomId,
                    path: normalizedPath,
                    color: last.color,
                    strokeWidth: last.strokeWidth,
                    isEraser: last.isEraser || false
                });
                return prev.slice(0, -1);
            });
        },
        toggleEyedropper: () => setIsEyedropperActive(p => !p),
        isEyedropperActive,
        clear: () => setPaths([]),
        historyCount: paths.length,
        redoCount: redoStack.length,
        exportCanvas: async () => {
            try {
                // Capture the view using react-native-view-shot
                if (canvasWrapperRef.current) {
                    const { captureRef } = await import('react-native-view-shot');
                    const uri = await captureRef(canvasWrapperRef, {
                        format: 'png',
                        quality: 1,
                    });

                    // Import Platform at the top level to check OS
                    const { Platform, Alert } = require('react-native');

                    // Try to save to MediaLibrary
                    try {
                        const { status } = await ExpoMediaLibrary.requestPermissionsAsync();
                        if (status === 'granted') {
                            const asset = await ExpoMediaLibrary.createAssetAsync(uri);
                            console.log('Saved to:', asset.uri);
                            return asset.uri;
                        } else {
                            console.log('Permission denied');
                            Alert.alert('Permission Denied', 'Please allow photo access to save drawings.');
                            return null;
                        }
                    } catch (mediaError: any) {
                        console.log('MediaLibrary error:', mediaError);

                        // On Android, use expo-sharing as a fallback
                        if (Platform.OS === 'android') {
                            try {
                                const Sharing = await import('expo-sharing');
                                const isAvailable = await Sharing.isAvailableAsync();
                                if (isAvailable) {
                                    await Sharing.shareAsync(uri, {
                                        mimeType: 'image/png',
                                        dialogTitle: 'Save your drawing',
                                    });
                                    return uri; // Return URI to indicate success
                                } else {
                                    Alert.alert(
                                        'Cannot Share',
                                        'Sharing is not available on this device.',
                                        [{ text: 'OK' }]
                                    );
                                }
                            } catch (shareError) {
                                console.log('Sharing error:', shareError);
                                Alert.alert(
                                    'Export Info',
                                    'The image was captured. To save directly to gallery, please use a development build.',
                                    [{ text: 'OK' }]
                                );
                            }
                        }
                        return null;
                    }
                }
                return null;
            } catch (error) {
                console.error('Export failed:', error);
                return null;
            }
        }
    }));

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                if (isEyedropperActiveRef.current) {
                    const { locationX, locationY } = evt.nativeEvent;
                    const allPaths = pathsRef.current;
                    for (let i = allPaths.length - 1; i >= 0; i--) {
                        const p = allPaths[i];
                        if (p.path.contains(locationX, locationY)) {
                            onColorPicked?.(p.color);
                            setIsEyedropperActive(false);
                            return;
                        }
                    }
                    return;
                }

                // Fill mode: tap to fill closed shapes with current color
                if (isFillModeRef.current) {
                    const { locationX, locationY } = evt.nativeEvent;
                    const allPaths = pathsRef.current;
                    for (let i = allPaths.length - 1; i >= 0; i--) {
                        const p = allPaths[i];
                        // Check if tap is inside this path
                        if (p.path.contains(locationX, locationY)) {
                            // Create updated stroke with fill color (fills inside of closed shapes)
                            const updatedPath = {
                                ...p,
                                fillColor: colorRef.current,
                            };
                            // Update paths - add fill to the tapped path
                            setPaths(prev => prev.map((path, idx) =>
                                idx === i ? updatedPath : path
                            ));
                            return;
                        }
                    }
                    // Always return in fill mode - don't start drawing
                    return;
                }

                let { locationX, locationY } = evt.nativeEvent;
                const { width, height } = canvasSizeRef.current;

                // Clamp coordinates to canvas bounds
                locationX = Math.max(0, Math.min(locationX, width));
                locationY = Math.max(0, Math.min(locationY, height));

                // Shape mode: store start point
                if (shapeModeRef.current !== 'none') {
                    shapeStartPoint.current = { x: locationX, y: locationY };
                    return;
                }

                // Freehand mode
                const newPath = Skia.Path.Make();
                newPath.moveTo(locationX, locationY);
                currentPath.current = newPath;
                setCurrentPathState(newPath.copy());

                // Initialize last valid position for jump detection
                lastValidPosition.current = { x: locationX, y: locationY };
            },
            onPanResponderMove: (evt: GestureResponderEvent) => {
                if (isEyedropperActiveRef.current) return;
                if (isFillModeRef.current) return; // No drawing in fill mode

                let { locationX, locationY } = evt.nativeEvent;
                const { width, height } = canvasSizeRef.current;

                // Clamp coordinates to canvas bounds
                locationX = Math.max(0, Math.min(locationX, width));
                locationY = Math.max(0, Math.min(locationY, height));

                // Shape mode: create preview shape
                if (shapeModeRef.current !== 'none' && shapeStartPoint.current) {
                    const shapePath = createShapePath(
                        shapeStartPoint.current,
                        { x: locationX, y: locationY },
                        shapeModeRef.current
                    );
                    if (shapePath) {
                        setCurrentPathState(shapePath);
                    }
                    return;
                }

                // Freehand mode
                // Check for sudden jumps (Android edge bug)
                if (lastValidPosition.current) {
                    const dx = Math.abs(locationX - lastValidPosition.current.x);
                    const dy = Math.abs(locationY - lastValidPosition.current.y);
                    if (dx > MAX_JUMP_DISTANCE || dy > MAX_JUMP_DISTANCE) {
                        // Skip this point - it's a jump, don't update path
                        return;
                    }
                }

                // Update last valid position
                lastValidPosition.current = { x: locationX, y: locationY };

                if (currentPath.current) {
                    // Use quadratic bezier curves for smooth drawing
                    if (previousPoint.current) {
                        // Calculate midpoint for smooth curve
                        const midX = (previousPoint.current.x + locationX) / 2;
                        const midY = (previousPoint.current.y + locationY) / 2;
                        // Draw quadratic bezier curve through the previous point to the midpoint
                        currentPath.current.quadTo(previousPoint.current.x, previousPoint.current.y, midX, midY);
                    } else {
                        // First move, just lineTo
                        currentPath.current.lineTo(locationX, locationY);
                    }
                    previousPoint.current = { x: locationX, y: locationY };
                    setCurrentPathState(currentPath.current.copy());

                    const normalizedPath = scalePathToNormalized(currentPath.current);
                    socketService.emit('drawing-move', {
                        roomId,
                        path: normalizedPath,
                        color: colorRef.current,
                        strokeWidth: strokeWidthRef.current,
                        isEraser: isEraserRef.current
                    });
                }
            },
            onPanResponderRelease: (evt: GestureResponderEvent) => handlePanResponderEnd(evt),
            onPanResponderTerminate: (evt: GestureResponderEvent) => handlePanResponderEnd(evt),
        })
    ).current;

    const handlePanResponderEnd = (evt: GestureResponderEvent) => {
        if (isEyedropperActiveRef.current) return;

        // Shape mode: finalize the shape
        if (shapeModeRef.current !== 'none' && shapeStartPoint.current) {
            let { locationX, locationY } = evt.nativeEvent;
            const { width, height } = canvasSizeRef.current;
            locationX = Math.max(0, Math.min(locationX, width));
            locationY = Math.max(0, Math.min(locationY, height));

            const shapePath = createShapePath(
                shapeStartPoint.current,
                { x: locationX, y: locationY },
                shapeModeRef.current
            );

            if (shapePath) {
                const normalizedPath = scalePathToNormalized(shapePath);
                const strokeData: Stroke = {
                    path: shapePath,
                    color: colorRef.current,
                    strokeWidth: strokeWidthRef.current,
                    userId,
                    isEraser: false,
                    brushConfig: brushConfigRef.current,
                };

                setPaths(prev => [...prev, strokeData]);
                setRedoStack([]);

                socketService.emit('draw-stroke', {
                    roomId,
                    path: normalizedPath,
                    color: colorRef.current,
                    strokeWidth: strokeWidthRef.current,
                    isEraser: false
                });
            }

            shapeStartPoint.current = null;
            setCurrentPathState(null);
            return;
        }

        // Freehand mode
        if (currentPath.current) {
            const normalizedPath = scalePathToNormalized(currentPath.current);
            const currentColor = colorRef.current;
            const currentStrokeWidth = strokeWidthRef.current;
            const currentIsEraser = isEraserRef.current;

            const strokeData: Stroke = {
                path: currentPath.current.copy(),
                color: currentColor,
                strokeWidth: currentStrokeWidth,
                userId,
                isEraser: currentIsEraser,
                brushConfig: brushConfigRef.current,
            };

            setPaths(prev => [...prev, strokeData]);
            setRedoStack([]);

            socketService.emit('draw-stroke', {
                roomId,
                path: normalizedPath,
                color: currentColor,
                strokeWidth: currentStrokeWidth,
                isEraser: currentIsEraser
            });

            currentPath.current = null;
            setCurrentPathState(null);
        }

        // Reset tracking for next stroke
        lastValidPosition.current = null;
        previousPoint.current = null;
    };

    useEffect(() => {
        const handleDrawStroke = (data: any) => {
            const { path, color, strokeWidth, userId: senderId, isEraser: strokeIsEraser } = data;

            setRemotePaths(prev => {
                const next = { ...prev };
                delete next[senderId];
                return next;
            });

            const skPath = scalePathToLocal(path);
            if (skPath) {
                setPaths((prev) => [...prev, {
                    path: skPath,
                    color,
                    strokeWidth,
                    userId: senderId,
                    isEraser: strokeIsEraser || false
                }]);
            }
        };

        const handleDrawingMove = (data: any) => {
            const { path, color, strokeWidth, userId: senderId, isEraser: strokeIsEraser } = data;

            if (senderId === userId) return;

            const skPath = scalePathToLocal(path);
            if (skPath) {
                setRemotePaths(prev => ({
                    ...prev,
                    [senderId]: { path: skPath, color, strokeWidth, isEraser: strokeIsEraser }
                }));
            }
        };

        const handleUndo = () => {
            setPaths(prev => prev.slice(0, -1));
        };

        const handleLoadCanvas = (strokes: any[]) => {
            if (!strokes || !Array.isArray(strokes)) return;
            const loadedPaths = strokes.map(s => {
                const skPath = scalePathToLocal(s.path);
                return skPath ? { ...s, path: skPath } : null;
            }).filter(Boolean) as Stroke[];
            setPaths(loadedPaths);
        };

        socketService.on('draw-stroke', handleDrawStroke);
        socketService.on('drawing-move', handleDrawingMove);
        socketService.on('undo-stroke', handleUndo);
        socketService.on('load-canvas', handleLoadCanvas);

        socketService.on('clear-canvas', () => {
            setPaths([]);
            setRemotePaths({});
        });

        // Request canvas data when ready
        if (isCanvasReady) {
            socketService.emit('get-canvas', roomId);
        }

        return () => {
            socketService.off('draw-stroke');
            socketService.off('drawing-move');
            socketService.off('undo-stroke');
            socketService.off('load-canvas');
            socketService.off('clear-canvas');
        };
    }, [userId, isCanvasReady]);

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setCanvasSize({ width, height });
        setIsCanvasReady(true);
    };

    // Eraser color - use canvas background color
    const eraserColor = Colors.spiderWhite;

    return (
        <View ref={containerRef} style={styles.container} onLayout={handleLayout}>
            {/* Canvas wrapper for screenshot capture */}
            <View ref={canvasWrapperRef} style={styles.canvasWrapper} collapsable={false}>
                <Canvas style={styles.canvas}>
                    {/* Permanent Paths */}
                    {paths.map((p, index) => {
                        const config = p.brushConfig || DEFAULT_BRUSH_CONFIG;
                        return (
                            <React.Fragment key={index}>
                                {/* Fill layer - rendered first (behind stroke) */}
                                {p.fillColor && (
                                    <Path
                                        path={p.path}
                                        color={p.fillColor}
                                        style="fill"
                                    />
                                )}
                                {/* Stroke layer - rendered on top of fill */}
                                <Path
                                    path={p.path}
                                    color={p.isEraser ? eraserColor : p.color}
                                    style="stroke"
                                    strokeWidth={p.isEraser ? p.strokeWidth * 2 : p.strokeWidth}
                                    strokeJoin={config.strokeJoin}
                                    strokeCap={config.strokeCap}
                                    opacity={p.isEraser ? 1 : config.opacity}
                                    blendMode={p.isEraser ? 'clear' : 'srcOver'}
                                />
                            </React.Fragment>
                        );
                    })}

                    {/* Remote Live Paths */}
                    {Object.entries(remotePaths).map(([uid, p]) => (
                        <Path
                            key={uid}
                            path={p.path}
                            color={p.isEraser ? eraserColor : p.color}
                            style="stroke"
                            strokeWidth={p.isEraser ? p.strokeWidth * 2 : p.strokeWidth}
                            strokeJoin="round"
                            strokeCap="round"
                            blendMode={p.isEraser ? 'clear' : 'srcOver'}
                        />
                    ))}

                    {/* My Current Path */}
                    {currentPathState && (
                        <Path
                            path={currentPathState}
                            color={isEraser ? eraserColor : color}
                            style="stroke"
                            strokeWidth={isEraser ? strokeWidth * 2 : strokeWidth}
                            strokeJoin={brushConfig.strokeJoin}
                            strokeCap={brushConfig.strokeCap}
                            opacity={isEraser ? 1 : brushConfig.opacity}
                            blendMode={isEraser ? 'clear' : 'srcOver'}
                        />
                    )}
                </Canvas>
            </View>
            <View style={styles.gestureOverlay as any} {...panResponder.panHandlers} />
        </View>
    );
});

export default DrawingCanvas;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    canvasWrapper: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    canvas: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gestureOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        zIndex: 10,
        ...Platform.select({
            web: {
                // @ts-ignore - Web only styles
                cursor: 'crosshair',
                userSelect: 'none',
                touchAction: 'none',
            }
        })
    }
});
