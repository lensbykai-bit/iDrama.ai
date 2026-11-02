#!/usr/bin/env bash
set -eu
mkdir -p android-wallet/test-output
trap 'adb logcat -d -s WalletDebug:I AndroidRuntime:E chromium:E > android-wallet/test-output/app.log' EXIT
adb install -r iDrama-Pay-v1.6.apk
adb shell svc wifi disable
adb shell svc data disable
adb shell am start -W -n ai.idrama.pay.recovery/ai.idrama.pay.MainActivity
for attempt in 1 2 3 4 5; do
  sleep 4
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml android-wallet/test-output/offline.xml
  adb exec-out screencap -p > android-wallet/test-output/offline.png
  if grep -q 'Generate QR' android-wallet/test-output/offline.xml && python3 android-wallet/assert-screen.py android-wallet/test-output/offline.png; then break; fi
done
grep -q 'Generate QR' android-wallet/test-output/offline.xml
grep -q 'iDrama Pay' android-wallet/test-output/offline.xml
python3 android-wallet/assert-screen.py android-wallet/test-output/offline.png
adb shell am force-stop ai.idrama.pay.recovery
adb shell am start -W -n ai.idrama.pay.recovery/ai.idrama.pay.MainActivity
for attempt in 1 2 3 4 5; do
  sleep 4
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml android-wallet/test-output/relaunch.xml
  adb exec-out screencap -p > android-wallet/test-output/relaunch.png
  if grep -q 'Generate QR' android-wallet/test-output/relaunch.xml && python3 android-wallet/assert-screen.py android-wallet/test-output/relaunch.png; then break; fi
done
grep -q 'Generate QR' android-wallet/test-output/relaunch.xml
python3 android-wallet/assert-screen.py android-wallet/test-output/relaunch.png
adb logcat -d -s AndroidRuntime:E > android-wallet/test-output/crash.log
if grep -q 'FATAL EXCEPTION' android-wallet/test-output/crash.log; then exit 1; fi
