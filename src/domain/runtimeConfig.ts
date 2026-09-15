export function isCommercialMode(): boolean {
  const configured = import.meta.env.VITE_COMMERCIAL_MODE;
  return configured === undefined || configured === '' || configured === 'true';
}
