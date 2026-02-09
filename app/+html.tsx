import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every
 * web page during static rendering.
 *
 * The contents of this function only run in Node.js environments and
 * do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

                {/* 
          This viewport tag is essential for preventing pinch-to-zoom on mobile 
          browsers while ensuring the app display correctly on all devices.
          Added interactive-widget=resizes-content to help with Android keyboard behavior.
        */}
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"
                />

                {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, generic scroll views on web will not prevent body scrolling.
        */}
                <ScrollViewStyleReset />

                {/* Using raw CSS styles as an escape hatch to ensure these styles depend on nothing */}
                <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
            </head>
            <body>{children}</body>
        </html>
    );
}

const responsiveBackground = `
html, body {
  height: 100%;
  overflow: hidden; /* Prevent scroll/bounce on the document itself */
  overscroll-behavior: none; /* strict no-bounce */
  -webkit-text-size-adjust: 100%; /* Prevent font scaling on rotation */
}
body {
  background-color: #fff;
  touch-action: none; /* aggressive touch blocking - let React Native Gesture Handler manage it */
}
/* Ensure the root React div takes full height */
#root {
  display: flex;
  height: 100%;
  width: 100%;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}
`;
