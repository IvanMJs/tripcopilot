# TripCopilot — App Icon & Splash Screen Resources

## Required source files

Place these files in this directory:

- `icon.png` — App icon, 1024x1024px, PNG, no transparency
- `icon-foreground.png` — Android adaptive icon foreground, 1024x1024px
- `icon-background.png` — Android adaptive icon background, 1024x1024px  
- `splash.png` — Splash screen center logo, 2732x2732px, PNG
- `splash-dark.png` — Splash screen for dark mode (optional)

## Design specs

- **Background color**: #080810 (dark navy)
- **Accent color**: #FFB800 (amber)
- **App icon**: Airplane silhouette or travel icon on dark background with amber accent
- **Splash**: Centered logo on #080810 background

## Generate native assets

After placing source files, run:

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#080810' --splashBackgroundColor '#080810'
```

This will generate all required sizes for iOS and Android in the native project directories.

## iOS icon sizes needed (generated automatically)
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024

## Android icon sizes needed (generated automatically)  
- mdpi (48x48), hdpi (72x72), xhdpi (96x96), xxhdpi (144x144), xxxhdpi (192x192)
