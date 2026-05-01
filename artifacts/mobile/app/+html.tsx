import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

const INTER_CDN = "https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.4.2";
const ICONS_CDN =
  "https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* Inter via Google Fonts CDN — usado como font-family "Inter" no tema web */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          /*
           * Aliases para os nomes usados pelo React Native Web quando fontFamily
           * vem do tema nativo (Inter_400Regular, etc.).
           * src usa URL real do jsDelivr — funciona sem Inter instalado localmente.
           */
          @font-face {
            font-family: 'Inter_400Regular';
            src: url('${INTER_CDN}/400Regular/Inter_400Regular.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_500Medium';
            src: url('${INTER_CDN}/500Medium/Inter_500Medium.ttf') format('truetype');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_600SemiBold';
            src: url('${INTER_CDN}/600SemiBold/Inter_600SemiBold.ttf') format('truetype');
            font-weight: 600;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_700Bold';
            src: url('${INTER_CDN}/700Bold/Inter_700Bold.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          /* Ionicons para @expo/vector-icons na web */
          @font-face {
            font-family: 'ionicons';
            src: url('${ICONS_CDN}') format('truetype');
            font-display: block;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
          }
        `}</style>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
