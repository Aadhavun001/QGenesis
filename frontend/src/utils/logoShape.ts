/** Shape class for logo image - must match AppLogoSettings getShapeClasses */
export function getLogoShapeClass(shape?: string): string {
  if (shape === 'circle') return 'rounded-full';
  if (shape === 'rounded') return 'rounded-2xl';
  return 'rounded-none';
}
