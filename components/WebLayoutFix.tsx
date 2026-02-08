import { Colors } from '../constants/Colors';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function WebLayoutFix() {
    if (Platform.OS !== 'web') return null;

    useEffect(() => {
        // Fix for white background on overscroll/keyboard push
        document.body.style.backgroundColor = Colors.spiderBlack;
        document.documentElement.style.backgroundColor = Colors.spiderBlack;

        // Prevent viewport shifting/resizing on virtual keyboard open
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport) {
            metaViewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content');
        }

        // Add global styles to prevent rubber-banding and white flashes
        const style = document.createElement('style');
        style.textContent = `
            body, html {
                background-color: ${Colors.spiderBlack} !important;
                overscroll-behavior: none;
                height: 100%;
                width: 100%;
            }
            #root {
                display: flex;
                flex: 1;
                height: 100%;
            }
        `;
        document.head.appendChild(style);

        return () => {
            // Cleanup if needed, though usually these persist well for SPA
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    return null;
}
