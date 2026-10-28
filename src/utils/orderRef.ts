export function generateOrderReference(): string {
  const timestamp = Date.now().toString().slice(-4);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `#CC-${timestamp}${randomSuffix}`;
}
