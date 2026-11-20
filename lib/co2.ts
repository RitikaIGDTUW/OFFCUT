/** Client-safe CO2 factors (also re-exported by models/Product). */
/** Rough CO2 saved per kg of material reused instead of newly produced (kg CO2e / kg). */
export const CO2_FACTOR: Record<string, number> = {
  leather: 17,
  textile: 15,
  fabric: 15,
  "gore-tex": 15,
  aluminium: 9,
  aluminum: 9,
  steel: 2,
  copper: 4,
  brass: 4,
  metal: 4,
  wood: 1.1,
  walnut: 1.1,
  oak: 1.1,
  teak: 1.1,
  veneer: 1.1,
  marble: 0.3,
  stone: 0.3,
  granite: 0.3,
  acrylic: 6,
  plastic: 3,
  carbon: 25,
  glass: 1.2,
  fibreglass: 2.5,
  cork: 0.5,
  foam: 3.5,
  hardware: 4,
};
export function co2Factor(materialType: string) {
  const m = materialType.toLowerCase();
  const hit = Object.keys(CO2_FACTOR).find((k) => m.includes(k));
  return hit ? CO2_FACTOR[hit] : 2;
}

