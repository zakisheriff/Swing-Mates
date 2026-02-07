import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// Load CanvasKit from CDN - more reliable than local file serving
const canvaskitVersion = '0.40.0'; // Match the version used by @shopify/react-native-skia@2.2.12

LoadSkiaWeb({
    locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${canvaskitVersion}/bin/full/${file}`
}).then(async () => {
    renderRootComponent(App);
});
