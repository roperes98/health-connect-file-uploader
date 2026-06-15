import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { parseTcx } from './utils/parseTcx';
import ExpoMedicalRecordsModule from 'expo-medical-records';
import {
  buildRecordsFromActivity,
  insertRecordsInBatches,
} from './utils/buildHealthConnectRecords';
import {
  initialize,
  requestPermission,
  insertRecords,
} from 'react-native-health-connect';

const COLORS = {
  background: '#EEF4FB',
  surface: '#FFFFFF',
  primary: '#0B6E99',
  primaryDark: '#094D6B',
  primaryLight: '#E6F4FE',
  text: '#1A2B3C',
  textMuted: '#5C7080',
  success: '#1B8A5A',
  successBg: '#E8F7EF',
  warning: '#C47A00',
  warningBg: '#FFF6E6',
  border: '#D8E4EE',
  accent: '#FF6B4A',
};

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  useEffect(() => {
    async function initHealthConnect() {
      try {
        const isAvailable = await initialize();
        if (isAvailable) {
          setIsInitialized(true);
          // Wait to request health connect permissions, noting Medical Records requires the newly added android.permission.health.WRITE_MEDICAL_DATA
          await requestPermission([
            { accessType: 'write', recordType: 'ExerciseSession' },
            { accessType: 'write', recordType: 'HeartRate' },
            { accessType: 'write', recordType: 'HeartRateVariabilityRmssd' },
          ]);
        }
      } catch (err) {
        console.warn('Health Connect initialization failed', err);
      } finally {
        setIsInitializing(false);
      }
    }
    initHealthConnect();
  }, []);

  const handlePickFile = async () => {
    if (!isInitialized) {
      Alert.alert(
        'Health Connect unavailable',
        'Health Connect is not initialized. Rebuild the app with a development or preview build (Expo Go is not supported) and grant permissions when prompted.'
      );
      return;
    }

    try {
      setIsUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        console.log('File picked:', fileUri);

        const fileContent = await new File(fileUri).text();

        console.log('File read successfully, length:', fileContent.length);

        const parsedActivities = parseTcx(fileContent);
        if (!parsedActivities || parsedActivities.length === 0) {
          Alert.alert('Error', 'No activities found in the TCX file.');
          return;
        }

        console.log(`Parsed ${parsedActivities.length} activities.`);

        const recordsToInsert = parsedActivities.flatMap(buildRecordsFromActivity);

        if (recordsToInsert.length > 0) {
          console.log('Records mapped, ready to insert. Count:', recordsToInsert.length);
          try {
            await insertRecordsInBatches(recordsToInsert, insertRecords);
            console.log('Successfully inserted records. Count:', recordsToInsert.length);
            Alert.alert(
              'Success',
              `Uploaded ${recordsToInsert.length} records to Health Connect.`
            );
          } catch (insertErr) {
            console.error('Insertion failed:', insertErr);
            Alert.alert(
              'Error',
              `Failed to insert records into Health Connect: ${insertErr?.message ?? insertErr}`
            );
          }
        }
      }
    } catch (err) {
      console.warn('File pick/parse failed', err);
      Alert.alert('Error', `Failed to process file: ${err?.message ?? err}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickPdfFile = async () => {
    if (!isInitialized) {
      Alert.alert(
        'Health Connect unavailable',
        'Health Connect is not initialized.'
      );
      return;
    }

    try {
      setIsUploadingPdf(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        console.log('PDF File picked:', fileUri);

        const formData = new FormData();
        formData.append('pdf', {
          uri: fileUri,
          name: result.assets[0].name || 'record.pdf',
          type: 'application/pdf',
        });

        // For Android emulator pointing to host localhost or configurable via process.env.API_URL
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/process-pdf';
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const fhirDataStr = data.fhirData;
        console.log('Got FHIR data from server');

        await ExpoMedicalRecordsModule.writeMedicalResource(fhirDataStr);

        Alert.alert('Success', 'Medical record uploaded to Health Connect.');
      }
    } catch (err) {
      console.warn('PDF process failed', err);
      Alert.alert('Error', `Failed to process PDF: ${err?.message ?? err}`);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const statusConfig = isInitializing
    ? {
        label: 'Connecting to Health Connect…',
        detail: 'Checking permissions and availability',
        color: COLORS.warning,
        bg: COLORS.warningBg,
        icon: 'sync-outline',
      }
    : isInitialized
      ? {
          label: 'Ready to import',
          detail: 'Health Connect is connected and permissions granted',
          color: COLORS.success,
          bg: COLORS.successBg,
          icon: 'checkmark-circle',
        }
      : {
          label: 'Health Connect unavailable',
          detail: 'Use a development or preview build — Expo Go is not supported',
          color: COLORS.accent,
          bg: '#FFF0ED',
          icon: 'alert-circle',
        };

  const canUpload = isInitialized && !isUploading && !isInitializing;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="fitness" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Health Connect Uploader</Text>
          <Text style={styles.subtitle}>
            Import workout data from TCX files into Android Health Connect
          </Text>
        </View>

        <View style={[styles.card, styles.statusCard, { backgroundColor: statusConfig.bg }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusConfig.color + '22' }]}>
            {isInitializing ? (
              <ActivityIndicator size="small" color={statusConfig.color} />
            ) : (
              <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
            )}
          </View>
          <View style={styles.statusTextWrap}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            <Text style={styles.statusDetail}>{statusConfig.detail}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Pressable
            style={({ pressed }) => [
              styles.uploadCard,
              { flex: 1, marginBottom: 0 },
              !canUpload && styles.uploadCardDisabled,
              pressed && canUpload && styles.uploadCardPressed,
            ]}
            onPress={handlePickFile}
            disabled={!canUpload}
          >
            <View style={styles.uploadIconWrap}>
              {isUploading ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={40} color={COLORS.primary} />
              )}
            </View>
            <Text style={styles.uploadTitle}>
              {isUploading ? 'Processing…' : 'Pick TCX File'}
            </Text>
            <Text style={styles.uploadHint}>
              {isUploading
                ? 'Uploading records'
                : 'Select .tcx workout'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.uploadCard,
              { flex: 1, marginBottom: 0 },
              !canUpload && styles.uploadCardDisabled,
              pressed && canUpload && styles.uploadCardPressed,
            ]}
            onPress={handlePickPdfFile}
            disabled={!canUpload}
          >
            <View style={styles.uploadIconWrap}>
              {isUploadingPdf ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={40} color={COLORS.primary} />
              )}
            </View>
            <Text style={styles.uploadTitle}>
              {isUploadingPdf ? 'Processing…' : 'Pick PDF Record'}
            </Text>
            <Text style={styles.uploadHint}>
              {isUploadingPdf
                ? 'Parsing PDF and uploading'
                : 'Select medical PDF'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What gets imported</Text>
          {[
            { icon: 'barbell-outline', label: 'Exercise sessions', desc: 'Sport, start and end times' },
            { icon: 'heart-outline', label: 'Heart rate samples', desc: 'BPM data from trackpoints' },
            { icon: 'pulse-outline', label: 'HRV (RMSSD)', desc: 'Calculated from heart rate when available' },
          ].map((item) => (
            <View key={item.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon} size={18} color={COLORS.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{item.label}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.sectionTitle}>How it works</Text>
          {['Select a TCX file', 'App parses your workout', 'Data is sent to Health Connect'].map(
            (step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1A2B3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...cardShadow,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...cardShadow,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderColor: 'transparent',
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextWrap: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusDetail: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  uploadCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    ...cardShadow,
  },
  uploadCardDisabled: {
    opacity: 0.55,
    borderColor: COLORS.border,
  },
  uploadCardPressed: {
    backgroundColor: COLORS.primaryLight,
    transform: [{ scale: 0.98 }],
  },
  uploadIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  uploadHint: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    paddingTop: 2,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDesc: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  stepsCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: 18,
    ...cardShadow,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
});
