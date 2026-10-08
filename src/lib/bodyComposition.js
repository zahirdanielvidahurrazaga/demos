// ============================================================================
// Composición corporal por bioimpedancia (BIA).
// Portado de `etekcity_esf551_ble` (BodyMetrics) — mismas fórmulas que aproximan
// a la app VeSync. Índices [Hombre, Mujer]; por defecto MUJER (todas las clientas).
// Entradas: peso (kg), estatura (cm), edad (años), impedancia (Ω).
// ============================================================================

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

export function computeBodyComposition({ weight_kg, height_cm, age, impedance, sex = 'F' }) {
  const s = sex === 'M' ? 0 : 1;
  const weight = Number(weight_kg);
  const height = Number(height_cm) / 100; // m
  const imp = Number(impedance);
  if (!weight || !height || !imp || !age) return null;

  // BMI
  const bmi = Math.floor((weight / (height * height)) * 100) / 100;

  // % grasa corporal
  const ageF = [0.103, 0.097], bmiF = [1.524, 1.545], cF = [22, 12.7];
  let bfp = Math.floor((ageF[s] * age + bmiF[s] * bmi - 500 / imp - cF[s]) * 10) / 10;
  bfp = Math.max(5, Math.min(75, bfp));

  // masa magra (peso sin grasa)
  const fatFree = r2(weight * (1 - bfp / 100));

  // grasa visceral (índice 1-30)
  const vBmi = [0.8666, 0.8895], vBfp = [0.0082, 0.0943], vFat = [0.026, -0.0534], vC = [14.2692, 16.215];
  let visceral = Math.trunc(vBmi[s] * bmi + vBfp[s] * bfp + vFat[s] * (weight - fatFree) - vC[s]);
  visceral = Math.max(1, Math.min(30, visceral));

  // grasa subcutánea %
  const scBfp = [0.965, 0.983], scV = [0.22, 0.303];
  const subcutaneous = r1(scBfp[s] * bfp - scV[s] * visceral);

  // agua corporal %
  const wF1 = [0.05, 0.06], wF2 = [0.76, 0.73];
  const wff1 = Math.max(1, wF1[s] * fatFree);
  let water = r1((wF2[s] * (fatFree - wff1)) / weight * 100);
  water = Math.max(10, Math.min(80, water));

  // metabolismo basal (kcal)
  let bmr = Math.trunc(fatFree * 21.6 + 370);
  bmr = Math.max(900, Math.min(2500, bmr));

  // músculo esquelético %
  const smF1 = [0.05, 0.06], smF2 = [0.68, 0.62];
  const smff1 = Math.max(1, smF1[s] * fatFree);
  const skeletalMuscle = r1((smF2[s] * (fatFree - smff1)) / weight * 100);

  // masa muscular kg
  const mmF = [0.05, 0.06];
  const mmff = Math.max(1, mmF[s] * fatFree);
  const muscleMass = r2(fatFree - mmff);

  // masa ósea kg
  const boneMass = Math.max(1, r2(mmF[s] * fatFree));

  // proteína %
  const pBfp = [1, 1.05];
  let protein = r1(100 - pBfp[s] * bfp - (boneMass / weight) * 100 - water);
  protein = Math.max(5, protein);

  // edad metabólica
  const metabolicAge = computeMetabolicAge(s, weight, height, bmi, bfp, age);

  return {
    bmi,
    body_fat_pct: bfp,
    fat_free_kg: fatFree,
    visceral_fat: visceral,
    subcutaneous_fat_pct: subcutaneous,
    body_water_pct: water,
    bmr,
    skeletal_muscle_pct: skeletalMuscle,
    muscle_mass_kg: muscleMass,
    bone_mass_kg: boneMass,
    protein_pct: protein,
    metabolic_age: metabolicAge,
  };
}

function computeMetabolicAge(s, weight, height, bmi, bfp, age) {
  // weight score
  const hF = [100, 137], wC = [80, 110], wFac = [0.7, 0.45];
  const res = wFac[s] * (hF[s] * height - wC[s]);
  let weightScore;
  if (res <= weight) {
    weightScore = res * 1.3 < weight ? 50 : Math.trunc(100 - (50 * (weight - res)) / (0.3 * res));
  } else if (res * 0.7 < weight) {
    weightScore = Math.trunc(100 - (50 * (res - weight)) / (0.3 * res));
  } else {
    weightScore = 0;
    for (let x = 0; x < 6; x++) { if ((res * x) / 10 > weight) { weightScore = x * 10; break; } }
  }
  // fat score
  const fC = [16, 26];
  let fatScore;
  if (fC[s] < bfp) fatScore = bfp >= 45 ? 50 : Math.trunc(100 - (50 * (bfp - fC[s])) / (45 - fC[s]));
  else fatScore = Math.trunc(100 - (50 * (fC[s] - bfp)) / (fC[s] - 5));
  // bmi score
  let bmiScore;
  if (bmi >= 22) bmiScore = bmi >= 35 ? 50 : Math.trunc(100 - 3.85 * (bmi - 22));
  else if (bmi >= 15) bmiScore = Math.trunc(100 - 3.85 * (22 - bmi));
  else if (bmi >= 10) bmiScore = 40;
  else if (bmi >= 5) bmiScore = 30;
  else bmiScore = 20;

  const health = Math.floor((weightScore + fatScore + bmiScore) / 3);
  const t = [50, 60, 65, 68, 70, 73, 75, 80, 85, 88, 90, 93, 95, 97, 98, 99];
  let adj = 16;
  for (let i = 0; i < t.length; i++) { if (health < t[i]) { adj = i; break; } }
  return Math.max(18, age + 8 - adj);
}

export function ageFromBirthDate(birth) {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b)) return null;
  const t = new Date();
  let y = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) y -= 1;
  return y;
}
