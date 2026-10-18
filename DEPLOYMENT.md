# ProSeU

The original AI Studio components, styles and assets are retained. The web app is published at https://marcusdhaynes.github.io/ProSeU/.

## Platforms

The manual Native builds workflow builds Windows, macOS, Linux and Android packages using the same web interface. iOS source can be generated with npm run ios:init on macOS; device distribution requires Apple signing. Native packages are unsigned development builds, not app-store releases.

## Services

The included server requires its original Gemini environment key. GitHub Pages cannot run server code. Set the repository variable API_BASE_URL to a separately deployed server origin to connect server-based AI features. No Gemini secret is included in public code. The original Google Cloud project currently has no billing configured, so its AI Studio publishing path cannot deploy a new server. Firebase authentication keeps the original project and now authorizes marcusdhaynes.github.io.

The original Next source remains under src/app. The web/ adapters retain those components while providing static, hash-based navigation on GitHub Pages. The original Genkit flows remain server-side under src/ai/flows.
