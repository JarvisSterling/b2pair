/**
 * Strip AI-generated boilerplate prefix from looking_for / offering text.
 * "As a X at Y, I'm looking for Z" → "Z"
 * "As a X at Y, I bring Z" → "Z"
 */
export function trimAiPrefix(text: string): string {
  const m = text.match(/^As a .+?,\s+I(?:'m looking for|'m seeking| bring|'m offering)\s+(.+)$/i);
  return m ? m[1] : text;
}
