
import { config } from 'dotenv';
config();

import '@/ai/flows/legal-document-summarizer.ts';
import '@/ai/flows/ai-situation-analysis.ts';
import '@/ai/flows/legal-news-summarizer.ts';
import '@/ai/flows/ai-url-data-extraction-flow.ts';
import '@/ai/flows/ai-legal-debrief-flow.ts';
import '@/ai/flows/ai-situation-analysis-flow.ts';
import '@/ai/flows/ai-legal-term-simplification-flow.ts';
import '@/ai/flows/ai-courtroom-interaction-flow.ts';
import '@/ai/flows/ai-document-drafting-flow.ts';
import '@/ai/flows/ai-mock-hearing-simulation-flow.ts';
import '@/ai/flows/ai-case-details-flow.ts';
import '@/ai/flows/ai-examination-coach-flow.ts';
