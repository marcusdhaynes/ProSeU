# ProSeU

The original AI Studio interface is hosted directly at https://marcusdhaynes.github.io/ProSeU/. Original components, styles and assets are retained.

Server-based AI requests connect to the existing https://subversion.ai.studio runtime. That runtime hosts the original Starborn map-analysis handler and ProSeU Genkit flows, with its existing server-side Gemini credential and spend cap. No secret is bundled into the app, and no new billing setup is required. Set the repository variable API_BASE_URL to use another compatible service.

Firebase authentication and data remain in the original Firebase project. The GitHub Pages domain is authorized for Google sign-in.

The Native builds workflow packages the same interface for Windows, macOS, Linux and Android. iOS source can be initialized with npm run ios:init on macOS. Device distribution requires Apple signing; desktop packages are unsigned development builds.

The original Next source remains in src/app. The web/ adapters reuse those exact components with static hash routing; original AI flows remain in src/ai/flows. The shared backend copies are versioned under services/proseu in the Subversion repository.
