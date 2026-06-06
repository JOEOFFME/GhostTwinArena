import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';

const API_BASE = 'http://127.0.0.1:8000'; // replace with local IP when testing on device

export default function MatchScreen({ route }) {
  const { legend } = route.params;
  const [matchState, setMatchState] = useState({ home_team: 'Morocco', away_team: 'Portugal', home_score: 0, away_score: 0, minute: 0 });
  const [reactions, setReactions] = useState([]);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const resp = await fetch(`${API_BASE}/match-state`);
        const data = await resp.json();
        setMatchState(data);
      } catch (e) {
        // ignore
      }
    }, 10000);
    return () => clearInterval(poll);
  }, []);

  const triggerEvent = async (eventType) => {
    setLoading(true);
    try {
      const event = { type: eventType, team: 'Morocco', scorer: 'Ziyech', minute: matchState.minute + 1 };
      await fetch(`${API_BASE}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
      const resp = await fetch(`${API_BASE}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
      const data = await resp.json();
      setReactions(prev => [{ ...data, type: eventType }, ...prev]);
      if (data.audio_url) {
        const { sound } = await Audio.Sound.createAsync({ uri: data.audio_url });
        await sound.playAsync();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not reach the API.');
    }
    setLoading(false);
  };

  const submitPrediction = async () => {
    if (!prediction.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prediction }) });
      const data = await resp.json();
      setReactions(prev => [{ text: data.legend_comment, type: 'PREDICTION' }, ...prev]);
      setPrediction('');
    } catch (e) {
      Alert.alert('Error', 'Prediction failed');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scoreboard}>
        <Text style={styles.teamName}>{matchState.home_team}</Text>
        <Text style={styles.score}>{matchState.home_score} - {matchState.away_score}</Text>
        <Text style={styles.teamName}>{matchState.away_team}</Text>
      </View>
      <Text style={styles.minute}>{matchState.minute > 0 ? `${matchState.minute}` : 'Pre-Match'}</Text>

      <View style={styles.legendBadge}><Text style={styles.legendBadgeText}>Watching with {legend.name}</Text></View>

      <View style={styles.eventRow}>
        {['GOAL', 'RED_CARD', 'VAR', 'PENALTY'].map(ev => (
          <TouchableOpacity key={ev} style={[styles.eventBtn, ev === 'GOAL' && { backgroundColor: '#008240' }]} onPress={() => triggerEvent(ev)} disabled={loading}>
            <Text style={styles.eventBtnText}>{ev}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.predictionRow}>
        <TextInput style={styles.input} placeholder="Your prediction..." placeholderTextColor="#555" value={prediction} onChangeText={setPrediction} />
        <TouchableOpacity style={styles.sendBtn} onPress={submitPrediction}><Text style={styles.sendBtnText}>Ask</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.feed}>
        {reactions.map((r, i) => (
          <View key={i} style={styles.reactionCard}>
            <Text style={styles.reactionMeta}>{r.type === 'PREDICTION' ? 'Your prediction' : `Event: ${r.type}`}</Text>
            <Text style={styles.reactionText}>{r.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e1a', padding: 16, paddingTop: 40 },
  scoreboard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 12, marginBottom: 6 },
  teamName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  score: { color: '#f0c040', fontSize: 28, fontWeight: '900' },
  minute: { textAlign: 'center', color: '#888', marginBottom: 12 },
  legendBadge: { backgroundColor: '#1a3020', borderRadius: 8, padding: 8, alignItems: 'center', marginBottom: 12 },
  legendBadgeText: { color: '#00c060', fontWeight: '600' },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eventBtn: { flex: 1, backgroundColor: '#c8102e', borderRadius: 8, padding: 10, marginHorizontal: 3, alignItems: 'center' },
  eventBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  predictionRow: { flexDirection: 'row', marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  sendBtn: { backgroundColor: '#008240', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700' },
  feed: { flex: 1 },
  reactionCard: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#008240' },
  reactionMeta: { color: '#008240', fontSize: 11, marginBottom: 4 },
  reactionText: { color: '#eee', fontSize: 15, lineHeight: 22 }
});
