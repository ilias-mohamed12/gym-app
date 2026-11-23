// Plan-Vorlagen. "fixed": 'start' = immer am Anfang (Aufwärmen), 'end' = immer am Ende (wird nicht rotiert).
// Tage: 0 = Mo … 6 = So.
const TEMPLATES = (() => {
  const W = (name, sets, reps, muscle = 'Aufwärmen') => ({ name, sets, reps, muscle, fixed: 'start' });
  const X = (name, sets, reps, muscle, fixed = '') => ({ name, sets, reps, muscle, fixed });

  // Aufwärmen / Korrektur gegen Rippen-Flare und Hohlkreuz (anteriore Beckenkippung).
  // "video": Name des Video-Fachs, das beim Laden angelegt und verknüpft wird.
  const warmCore = [
    { ...W('Dead Hang', 2, '30–45 s'), video: 'Dead Hang' },
    W('90/90 Atmung', 2, '5 Atemzüge'),
    W('Dead Bug', 2, '8/Seite'),
    { ...W('Pelvic Tilt & Glute Bridge', 2, '12'), video: 'Pelvic Tilt & Glute Bridge' },
    { ...W('Hohlkreuz-Routine (4 Übungen)', 1, '1 Runde'), video: 'Hohlkreuz-Routine (4 Übungen)' },
  ];
  const warm = {
    push: W('Serratus Wall Slides', 2, '10'),
    pull: W('Band Pull-Aparts', 2, '15'),
    legs: { ...W('Leg-Day Dehnroutine', 1, '1 Runde'), video: 'Leg-Day Dehnroutine' },
  };
  const note = '1–2 Wdh. im Tank · obere Wdh.-Grenze in allen Sätzen erreicht → Gewicht erhöhen';

  const split6 = [
    { name: 'Tag 1 · Push A', days: [0], warm: 'push', ex: [
      X('Smith-Schrägbank', 4, '6–10', 'Brust'),
      X('Schulterpresse (Maschine)', 2, '8–12', 'Schultern'),
      X('Kabel-Seitheben', 3, '12–20', 'Schultern'),
      X('Trizeps-Pushdowns', 3, '8–15', 'Trizeps'),
      X('Crunch-Maschine', 3, '8–15', 'Bauch', 'end'),
      X('Hanging Leg Raises', 2, '10–15', 'Bauch', 'end'),
    ] },
    { name: 'Tag 2 · Pull A', days: [1], warm: 'pull', ex: [
      X('Breiter Latzug', 3, '8–12', 'Lat'),
      X('Enges Rudern (Maschine)', 3, '8–12', 'Oberer Rücken'),
      X('Face Pulls', 2, '12–20', 'Hintere Schulter'),
      X('Einarmige Cable Curls', 3, '8–15', 'Bizeps'),
      X('Smith-RDL', 3, '8–12', 'Beinbeuger & Po'),
      X('Neck Curls', 2, '12–20', 'Nacken', 'end'),
    ] },
    { name: 'Tag 3 · Beine A', days: [2], warm: 'legs', ex: [
      X('Hack Squat / Beinpresse', 3, '8–12', 'Quadrizeps'),
      X('Hüftabduktion (Maschine)', 3, '12–20', 'Po'),
      X('Beinbeuger-Maschine', 2, '10–15', 'Beinbeuger'),
      X('Wadenmaschine', 3, '10–20', 'Waden'),
      X('Reverse Crunches', 3, '10–20', 'Bauch', 'end'),
    ] },
    { name: 'Tag 4 · Push B', days: [3], warm: 'push', ex: [
      X('Konvergierende Brustpresse', 3, '8–12', 'Brust'),
      X('Schulterpresse (Maschine)', 2, '8–12', 'Schultern'),
      X('Maschinen-Seitheben', 3, '12–20', 'Schultern'),
      X('Trizeps-Pushdowns', 3, '8–15', 'Trizeps'),
      X('Cable Crunches', 3, '8–15', 'Bauch', 'end'),
      X('Hanging Leg Raises', 2, '10–15', 'Bauch', 'end'),
    ] },
    { name: 'Tag 5 · Pull B', days: [4], warm: 'pull', ex: [
      X('Breiter Latzug', 3, '8–12', 'Lat'),
      X('Breites Rudern (Maschine)', 3, '8–12', 'Oberer Rücken'),
      X('Reverse Pec Deck', 2, '12–20', 'Hintere Schulter'),
      X('Hammer Curls (KH)', 3, '8–15', 'Bizeps'),
      X('Rückenstrecker-Maschine', 2, '10–15', 'Unterer Rücken'),
      X('Grip Curls (Kabelzug)', 2, '12–20', 'Unterarme', 'end'),
    ] },
    { name: 'Tag 6 · Brust + Beine B', days: [5], warm: 'legs', ex: [
      X('Smith-Schrägbank', 3, '10–15', 'Brust'),
      X('Smith Bulgarian Split Squats', 3, '8–12/Bein', 'Quadrizeps & Po'),
      X('Beinbeuger-Maschine', 3, '10–15', 'Beinbeuger'),
      X('Wadenmaschine', 3, '10–20', 'Waden'),
      X('Reverse Crunches', 3, '10–20', 'Bauch', 'end'),
    ] },
  ];

  return {
    split6: {
      title: 'Mein 6-Tage-Plan',
      subtitle: 'Push A · Pull A · Beine A · Push B · Pull B · Brust + Beine B (Mo–Sa, So Ruhe) mit Aufwärmen gegen Rippen-Flare & Hohlkreuz',
      version: 2,
      plans: split6.map((d) => ({ name: d.name, days: d.days, rotate: true, note, exercises: [...warmCore, warm[d.warm], ...d.ex] })),
    },
  };
})();
