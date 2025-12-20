/**
 * Substitute variables in a prompt template
 * @param template - Template string with {variable} placeholders
 * @param values - Object with variable values
 * @returns Rendered prompt with substituted values
 */
export function substitutePromptVariables(
  template: string,
  values: Record<string, string | number>
): string {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

/**
 * Extract variable names from a template
 * @param template - Template string with {variable} placeholders
 * @returns Array of variable names
 */
export function extractVariableNames(template: string): string[] {
  const regex = /\{(\w+)\}/g;
  const matches = template.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables have values
 * @param template - Template string
 * @param values - Variable values
 * @returns Object with isValid and missing variables
 */
export function validatePromptVariables(
  template: string,
  values: Record<string, string | number>
): { isValid: boolean; missing: string[] } {
  const requiredVars = extractVariableNames(template);
  const missing = requiredVars.filter(
    (varName) => !values[varName] || String(values[varName]).trim() === ''
  );

  return {
    isValid: missing.length === 0,
    missing,
  };
}
