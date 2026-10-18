/**
 * @fileOverview Utility for sanitizing and formatting AI analysis outputs.
 */

import { AISituationAnalysisOutput } from "@/ai/flows/ai-situation-analysis-flow";

export interface SanitizedAnalysis extends AISituationAnalysisOutput {}

export function sanitizeAnalysisOutput(raw: any): SanitizedAnalysis {
  // Ensure we have strings for all required fields
  return {
    laymanSummary: raw.laymanSummary || "No summary available.",
    legalLandscape: raw.legalLandscape || "Information pending.",
    riskFactors: raw.riskFactors || "Assessment pending.",
    recommendedActions: raw.recommendedActions || "No recommendations at this time.",
    avoidActions: raw.avoidActions || "No specific cautions identified.",
    strategicGuidance: raw.strategicGuidance || "Continue gathering information.",
  };
}
