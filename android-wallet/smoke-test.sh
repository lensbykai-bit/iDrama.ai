#!/usr/bin/env bash
set -eu
mkdir -p android-wallet/test-output
adb install -r iDrama-Pay-v1.6.apk
adb shell svc wifi disable
adb shell svc data disable
adb shell am start -W -n ai.idrama.pay.recovery/ai.idrama.pay.MainActivity
sleep 5
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml android-wallet/test-output/offline.xml
adb exec-out screencap -p > android-wallet/test-output/offline.png
grep -q 'Generate QR' android-wallet/test-output/offline.xml
grep -q 'iDrama Pay' android-wallet/test-output/offline.xml
adb shell am force-stop ai.idrama.pay.recovery
adb shell am start -W -n ai.idrama.pay.recovery/ai.idrama.pay.MainActivity
sleep 3
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml android-wallet/test-output/relaunch.xml
grep -q 'Generate QR' android-wallet/test-output/relaunch.xml
adb shell input keyevent 20
adb shell input keyevent 66
adb logcat -d -s AndroidRuntime:E > android-wallet/test-output/crash.log
if grep -q 'FATAL EXCEPTION' android-wallet/test-output/crash.log; then exit 1; fi
