const TCX_SPORT_TO_EXERCISE_TYPE = {
  Running: 56,
  Biking: 8,
  Other: 0,
};

const INSERT_BATCH_SIZE = 500;

function mapSportToExerciseType(sport) {
  return TCX_SPORT_TO_EXERCISE_TYPE[sport] ?? 0;
}

function groupHeartRateSamplesByMinute(samples) {
  if (!samples || samples.length === 0) {
    return [];
  }

  const buckets = new Map();

  for (const sample of samples) {
    const sampleTime = new Date(sample.time);
    const bucketStart = new Date(sampleTime);
    bucketStart.setUTCSeconds(0, 0);
    const key = bucketStart.toISOString();

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(sample);
  }

  const records = [];

  for (const bucketSamples of buckets.values()) {
    const sortedSamples = bucketSamples.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    records.push({
      recordType: 'HeartRate',
      startTime: sortedSamples[0].time,
      endTime: sortedSamples[sortedSamples.length - 1].time,
      samples: sortedSamples,
    });
  }

  return records.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

function buildRecordsFromActivity(activity) {
  if (!activity.startTime || !activity.endTime) {
    return [];
  }

  const records = [
    {
      recordType: 'ExerciseSession',
      startTime: activity.startTime,
      endTime: activity.endTime,
      exerciseType: mapSportToExerciseType(activity.sport),
      title: `${activity.sport || 'Exercise'} from TCX`,
    },
  ];

  records.push(...groupHeartRateSamplesByMinute(activity.heartRateSamples));

  if (activity.rmssd) {
    records.push({
      recordType: 'HeartRateVariabilityRmssd',
      time: activity.endTime,
      heartRateVariabilityMillis: activity.rmssd,
    });
  }

  return records;
}

async function insertRecordsInBatches(records, insertRecords) {
  const recordsByType = new Map();

  for (const record of records) {
    const type = record.recordType;
    if (!recordsByType.has(type)) {
      recordsByType.set(type, []);
    }
    recordsByType.get(type).push(record);
  }

  for (const typeRecords of recordsByType.values()) {
    for (let i = 0; i < typeRecords.length; i += INSERT_BATCH_SIZE) {
      const batch = typeRecords.slice(i, i + INSERT_BATCH_SIZE);
      await insertRecords(batch);
    }
  }
}

module.exports = {
  buildRecordsFromActivity,
  groupHeartRateSamplesByMinute,
  insertRecordsInBatches,
  mapSportToExerciseType,
};
