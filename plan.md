1. Edit `app.json` to add the `android.permission.health.WRITE_MEDICAL_DATA` permission and add `expo-medical-records` to the plugins array.
2. Use `read_file` to verify the `app.json` changes.
3. Edit the Kotlin module file and `build.gradle` inside `modules/expo-medical-records/android` to implement Android-only `HealthConnectClient` and write `MedicalResource`. Fix any module resolution issues for the local Expo module so `prebuild` works properly.
4. Use `read_file` to verify the Kotlin implementation.
5. Create `server/index.js` and implement an Express endpoint that receives a PDF, uses `markitdown-ts` to extract text, and returns structured FHIR JSON.
6. Use `read_file` on `server/index.js` to verify the server code.
7. Edit `App.js` to add the UI button 'Upload Medical Record (PDF)' using `expo-document-picker`.
8. Edit `App.js` to implement the function that uploads the picked PDF to the local Node server and passes the returned FHIR data to the Android native `expo-medical-records` module.
9. Use `read_file` on `App.js` to verify the React Native changes.
10. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
11. Build the Android app (`npx expo run:android`) to ensure no regressions were introduced.
12. Submit the changes.
