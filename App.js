import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseTcx } from './utils/parseTcx';
import {
  initialize,
  requestPermission,
  insertRecords
} from 'react-native-health-connect';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initHealthConnect() {
      try {
        const isAvailable = await initialize();
        if (isAvailable) {
          setIsInitialized(true);
          await requestPermission([
            { accessType: 'write', recordType: 'ExerciseSession' },
            { accessType: 'write', recordType: 'HeartRate' },
            { accessType: 'write', recordType: 'HeartRateVariabilityRmssd' },
          ]);
        }
      } catch (err) {
        console.warn('Health Connect initialization failed', err);
      }
    }
    initHealthConnect();
  }, []);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        console.log("File picked:", fileUri);

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        console.log("File read successfully, length:", fileContent.length);

        const parsedActivities = parseTcx(fileContent);
        if (parsedActivities && parsedActivities.length > 0) {
          console.log(`Parsed ${parsedActivities.length} activities.`);

          let recordsToInsert = [];

          for (const activity of parsedActivities) {
            if (activity.startTime && activity.endTime) {
              const exerciseSessionRecord = {
                recordType: 'ExerciseSession',
                startTime: activity.startTime,
                endTime: activity.endTime,
                exerciseType: 56, // Running as default, mapping can be improved
                title: `${activity.sport || 'Exercise'} from TCX`,
              };
              recordsToInsert.push(exerciseSessionRecord);

              if (activity.heartRateSamples && activity.heartRateSamples.length > 0) {
                const heartRateRecord = {
                  recordType: 'HeartRate',
                  startTime: activity.startTime,
                  endTime: activity.endTime,
                  samples: activity.heartRateSamples,
                };
                recordsToInsert.push(heartRateRecord);
              }

              if (activity.rmssd) {
                const hrvRecord = {
                  recordType: 'HeartRateVariabilityRmssd',
                  time: activity.endTime,
                  heartRateVariabilityMillis: activity.rmssd,
                };
                recordsToInsert.push(hrvRecord);
              }
            }
          }

          if (recordsToInsert.length > 0) {
            console.log("Records mapped, ready to insert. Count:", recordsToInsert.length);
            try {
              const insertedIds = await insertRecords(recordsToInsert);
              console.log("Successfully inserted records with IDs:", insertedIds);
              Alert.alert('Success', 'Records uploaded to Health Connect!');
            } catch (insertErr) {
              console.error("Insertion failed:", insertErr);
              Alert.alert('Error', 'Failed to insert records into Health Connect');
            }
          }
        }
      }
    } catch (err) {
      console.warn('File pick/parse failed', err);
      Alert.alert('Error', 'Failed to process file');
    }
  };

  return (
    <View style={styles.container}>
      <Text>Health Connect Uploader</Text>
      <Text>{isInitialized ? 'Health Connect Initialized' : 'Initializing...'}</Text>
      <Button title="Pick TCX File" onPress={handlePickFile} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
