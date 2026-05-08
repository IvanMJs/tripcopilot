# TripCopilot — CI/CD Mobile Builds

Build iOS and Android apps from GitHub Actions without local Xcode/Android Studio.

## Setup: GitHub Secrets

### Android secrets

| Secret | How to get it |
|--------|--------------|
| `GOOGLE_SERVICES_JSON_B64` | `base64 -w0 google-services.json` |
| `ANDROID_KEYSTORE_B64` | Generate keystore: `keytool -genkeypair -v -keystore release.keystore -alias tripcopilot -keyalg RSA -keysize 2048 -validity 10000`, then `base64 -w0 release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Password you chose when generating the keystore |
| `ANDROID_KEY_ALIAS` | `tripcopilot` (or whatever alias you chose) |
| `ANDROID_KEY_PASSWORD` | Key password (can be same as keystore password) |
| `PLAY_STORE_SERVICE_ACCOUNT_JSON` | Google Play Console → Setup → API access → Create service account → JSON key |

### iOS secrets

| Secret | How to get it |
|--------|--------------|
| `GOOGLE_SERVICE_INFO_PLIST_B64` | `base64 -w0 GoogleService-Info.plist` |
| `IOS_CERTIFICATE_P12_B64` | Apple Developer → Certificates → Create distribution cert → Export as .p12 → `base64 -w0 cert.p12` |
| `IOS_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `IOS_CODE_SIGN_IDENTITY` | Usually `Apple Distribution: Your Name (TEAM_ID)` |
| `IOS_PROVISIONING_PROFILE_B64` | Apple Developer → Profiles → Create App Store profile → Download → `base64 -w0 profile.mobileprovision` |
| `IOS_PROVISIONING_PROFILE_NAME` | Name of the provisioning profile |
| `APPLE_TEAM_ID` | Apple Developer → Membership → Team ID |
| `APPSTORE_ISSUER_ID` | App Store Connect → Users and Access → Integrations → App Store Connect API → Issuer ID |
| `APPSTORE_API_KEY_ID` | Create API key → Key ID |
| `APPSTORE_API_PRIVATE_KEY` | Download .p8 key file content |

## Usage

### Build Android
1. Go to Actions → "Build Android"
2. Click "Run workflow"
3. Choose track (`internal` for testing, `production` for release)
4. The AAB is uploaded as artifact and optionally to Play Store

### Build iOS
1. Go to Actions → "Build iOS"
2. Click "Run workflow"
3. Choose whether to upload to TestFlight
4. The IPA is uploaded as artifact and optionally to TestFlight

## First time setup

### Android
1. Generate a release keystore (see table above)
2. Create a Google Play Developer account ($25)
3. Create the app in Play Console with package name `app.tripcopilot.mobile`
4. Upload a first AAB manually (Play Console requires this before API uploads work)
5. Set up API access with a service account

### iOS
1. Create an Apple Developer account ($99/year)
2. Create an App ID for `app.tripcopilot.mobile` in Apple Developer portal
3. Enable Push Notifications and Associated Domains capabilities
4. Create a distribution certificate and provisioning profile
5. Create the app in App Store Connect
6. Set up an App Store Connect API key for CI uploads
