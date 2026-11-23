# FitBox – Kalorien, Mahlzeiten, Training, Übungsvideos

Einfache Web-App fürs iPhone (läuft wie eine normale App vom Home-Bildschirm, auch offline).
Alle Daten bleiben **nur auf dem Gerät** (IndexedDB) – kein Konto, keine Cloud.

## Funktionen
- **Heute:** Kalorien-Ring (gegessen / übrig), optional Protein, Tage vor/zurück blättern
- **Mahlzeiten:** Gerichte speichern und mit einem Tipp eintragen
- **Training:** Pläne mit Trainingstagen (z. B. Mo + Do → „Heute dran“), Übungen mit Sätzen, Wdh., kg,
  Notiz und verknüpftem Video-Fach. Im Training: „Letztes Mal“, Gewicht per − / + für alle Sätze,
  Sätze abhaken, Pausen-Timer. Beim Beenden neue Gewichte in den Plan übernehmen, 🏆 Rekorde,
  Fortschritt pro Übung mit Kurve, Verlauf
- **Übung per Video (KI):** Im Split-Day „Übung per Video hinzufügen“ → die KI (Claude) erkennt die
  Übung, die Muskelgruppe und schlägt Sätze/Wdh. vor und wählt einen 2–3 s Clip, der in Schleife läuft
  (im Plan und im Training). Clip per Schieberegler anpassbar. Ohne API-Schlüssel: Name selbst eingeben.
  Gesendet werden nur ~6–12 kleine Einzelbilder, nicht das Video. Braucht einen eigenen Anthropic-API-
  Schlüssel (Einstellungen), Kosten ca. 1–3 Cent pro Video, nicht im Claude-Abo enthalten.
- **Videos:** Fächer (z. B. „Pelvic Tilt“) mit Übungsvideos aus der Galerie oder direkt aufgenommen
- **Einstellungen:** Kalorien-/Proteinziel, Gewichtsschritt (1 / 1,25 / 2,5 / 5 kg), Pausenzeit, Sicherung exportieren/importieren (ohne Videos)

## Aufs iPhone
1. App-Adresse in **Safari** öffnen (muss über https gehostet sein, z. B. GitHub Pages).
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. App über das neue Icon öffnen.

## Technik
Reines HTML/CSS/JS ohne Build-Schritt: `index.html`, `app.css`, `app.js`, `db.js` (IndexedDB),
`sw.js` (Offline-Cache), `manifest.webmanifest`, `icons/`, `vendor/anthropic-sdk.mjs`
(offizielles Anthropic-SDK 1.6.0 als Browser-Bundle, Lizenzdateien daneben).
Lokal testen: `python3 -m http.server` im Ordner und `http://localhost:8000` öffnen.
