const { XMLParser } = require('fast-xml-parser');

function calculateRmssdFromHr(heartRateSamples) {
  if (!heartRateSamples || heartRateSamples.length < 2) return null;

  // Calculate approximate RR intervals from BPM (60000 / BPM)
  const rrIntervals = heartRateSamples.map(sample => 60000 / sample.beatsPerMinute);

  let sumDiffSq = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i-1];
    sumDiffSq += diff * diff;
  }

  const rmssd = Math.sqrt(sumDiffSq / (rrIntervals.length - 1));
  return rmssd;
}

function parseTcx(tcxData) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  const jsonObj = parser.parse(tcxData);

  const activities = jsonObj.TrainingCenterDatabase?.Activities?.Activity;
  if (!activities) {
    return [];
  }

  const activitiesList = Array.isArray(activities) ? activities : [activities];

  return activitiesList.map(activity => {
    const sport = activity["@_Sport"];
    const id = activity.Id;

    let laps = activity.Lap;
    if (!laps) laps = [];
    const lapsList = Array.isArray(laps) ? laps : [laps];

    let startTime = null;
    let endTime = null;
    let totalTimeSeconds = 0;

    const heartRateSamples = [];

    lapsList.forEach(lap => {
      if (!startTime) {
        startTime = lap["@_StartTime"];
      }
      totalTimeSeconds += parseFloat(lap.TotalTimeSeconds || 0);

      let tracks = lap.Track;
      if (tracks) {
        const tracksList = Array.isArray(tracks) ? tracks : [tracks];
        tracksList.forEach(track => {
          let trackpoints = track.Trackpoint;
          if (trackpoints) {
            const trackpointsList = Array.isArray(trackpoints) ? trackpoints : [trackpoints];
            trackpointsList.forEach(tp => {
              if (tp.HeartRateBpm && tp.HeartRateBpm.Value) {
                heartRateSamples.push({
                  time: tp.Time,
                  beatsPerMinute: parseInt(tp.HeartRateBpm.Value, 10)
                });
              }
              endTime = tp.Time;
            });
          }
        });
      }
    });

    if (!endTime && startTime) {
      const startDate = new Date(startTime);
      startDate.setSeconds(startDate.getSeconds() + totalTimeSeconds);
      endTime = startDate.toISOString();
    }

    const rmssd = calculateRmssdFromHr(heartRateSamples);

    return {
      sport,
      id,
      startTime,
      endTime,
      heartRateSamples,
      rmssd
    };
  });
}

module.exports = { parseTcx };
