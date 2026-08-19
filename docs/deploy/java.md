# For your 'preview' profile (generates a standard APK)

eas build --profile preview --platform android --local

# For your 'development' profile (generates a debug APK)

eas build --profile development --platform android --local

# Create a temp folder in your home directory where there's more space

mkdir -p ~/eas-tmp
export TMPDIR=~/eas-tmp
eas build --profile preview --platform android --local

htoomyatnyinyi@fedora:~/Desktop/pos_app$ # Clean up native build folders and reset local Expo cache
bunx expo prebuild --clean
