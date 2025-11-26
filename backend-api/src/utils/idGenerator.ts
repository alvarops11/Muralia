// file: src/utils/idGenerator.ts
export const generateId = (prefix: string): string => {
  // Genera algo como: "tablero_1715629384521_abc"
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 5);
  return `${prefix}_${timestamp}_${random}`;
};