export enum VoicePingQuality {
  EXCELLENT = 'excellent',
  FAIR = 'fair',
  POOR = 'poor'
}

const EXCELLENT_RTT_MS = 75;
const FAIR_RTT_MS = 150;
const EXCELLENT_LOSS_PERCENT = 2;
const FAIR_LOSS_PERCENT = 5;

const getPacketLossPercent = (packetsLost: number, packetsReceived: number) => {
  const total = packetsLost + packetsReceived;

  if (total <= 0) return 0;

  return (packetsLost / total) * 100;
};

const getVoicePingQuality = (
  rttMs: number,
  lossPercent: number
): VoicePingQuality => {
  if (rttMs >= FAIR_RTT_MS || lossPercent >= FAIR_LOSS_PERCENT) {
    return VoicePingQuality.POOR;
  }

  if (rttMs >= EXCELLENT_RTT_MS || lossPercent >= EXCELLENT_LOSS_PERCENT) {
    return VoicePingQuality.FAIR;
  }

  return VoicePingQuality.EXCELLENT;
};

export { getPacketLossPercent, getVoicePingQuality };
