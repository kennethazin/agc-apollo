export function convertGeoToCartesian(
  latitude: number,
  longitude: number,
  altitude: number = 0,
  earthRadius: number
): [number, number, number] {
  const latRad = (latitude * Math.PI) / 180; // Convert latitude to radians
  const lonRad = (longitude * Math.PI) / 180; // Convert longitude to radians

  const r = earthRadius + altitude; // Add altitude to the Earth's radius

  const x = r * Math.cos(latRad) * Math.cos(lonRad);
  const y = r * Math.sin(latRad);
  const z = r * Math.cos(latRad) * Math.sin(lonRad);

  return [x, y, z];
}

export function convertMoonGeoToCartesian(
  latitude: number,
  longitude: number,
  altitude: number = 0,
  moonRadius: number
): [number, number, number] {
  const latRad = (latitude * Math.PI) / 180; // Convert latitude to radians
  const lonRad = (longitude * Math.PI) / 180; // Convert longitude to radians

  const r = moonRadius + altitude; // Add altitude to the Moon's radius

  const x = r * Math.cos(latRad) * Math.cos(lonRad);
  const y = r * Math.sin(latRad);
  const z = r * Math.cos(latRad) * Math.sin(lonRad);

  return [x, y, z];
}
