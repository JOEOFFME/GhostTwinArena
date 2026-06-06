import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';

const LEGEND = {
  id: 'hadji',
  name: 'Mustapha Hadji',
  years: '1994 - 2007',
  style: 'The Fire',
  description: 'Fiery, poetic, speaks from the heart.',
  locked: false,
};

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>GHOST TWIN ARENA</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Choose Your Legend</Text>
        <Text style={styles.heroSubtitle}>Who watches the match with you tonight?</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.badge}><Text style={styles.badgeText}>{LEGEND.style}</Text></View>
        <Text style={styles.legendName}>{LEGEND.name}</Text>
        <Text style={styles.legendYears}>{LEGEND.years}</Text>
        <Text style={styles.legendDesc}>{LEGEND.description}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Match', { legend: LEGEND })}
        >
          <Text style={styles.buttonText}>Watch with Hadji</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.locked}>+ 4 more Legends — Unlock with Twin Coins</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e1a', alignItems: 'center', padding: 20 },
  header: { width: '100%', paddingVertical: 8, alignItems: 'flex-start' },
  brand: { color: '#fff', fontWeight: '900', fontSize: 14 },
  hero: { marginTop: 10, marginBottom: 20, alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSubtitle: { color: '#888', fontSize: 13, marginTop: 6 },
  card: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#111', alignItems: 'flex-start' },
  badge: { backgroundColor: '#c8102e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  legendName: { fontSize: 22, fontWeight: '900', color: '#fff' },
  legendYears: { fontSize: 13, color: '#aaa', marginTop: 6, marginBottom: 8 },
  legendDesc: { fontSize: 14, color: '#ccc', marginBottom: 12 },
  button: { backgroundColor: '#008240', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22, alignSelf: 'stretch', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  locked: { marginTop: 18, color: '#555', fontSize: 13 }
});
