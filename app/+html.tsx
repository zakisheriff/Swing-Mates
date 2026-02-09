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
        */}
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
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
body {
  background-color: #fff;
  touch-action: pan-x pan-y; /* Disables double-tap zoom */
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}
`;
