// Browser boundary: keep Gemini credentials on the original server.
export class GoogleGenAI {
  constructor(_options: unknown) {}
  models = {
    generateContent: async (input: unknown) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://subversion.ai.studio' : '')}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('The original AI service is not connected to this deployment.');
      return response.json();
    },
  };
}
