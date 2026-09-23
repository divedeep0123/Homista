import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const colors = {
  background: '#f7f8f5',
  ink: '#1e2922',
  muted: '#68746b',
  green: '#286445',
  paleGreen: '#e7efe8',
  white: '#ffffff',
};

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>homista</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>H</Text></View>
        </View>

        <Text style={styles.eyebrow}>YOUR HOME JOURNEY</Text>
        <Text style={styles.title}>Build with{ '\n' }confidence.</Text>
        <Text style={styles.subtitle}>Your home project, in one place.</Text>

        <View style={styles.card}>
          <View style={styles.icon}><Text style={styles.iconText}>⌂</Text></View>
          <Text style={styles.cardTitle}>Your first project starts here</Text>
          <Text style={styles.cardBody}>Bring your plans, budget, and next steps together as you build your home.</Text>
          <View accessibilityRole="button" accessibilityLabel="Create your first project" style={styles.button}>
            <Text style={styles.buttonText}>Create your first project</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>

        <View style={styles.tip}>
          <Text style={styles.tipLabel}>A GOOD PLACE TO BEGIN</Text>
          <Text style={styles.tipText}>Start with your plot size and the home you have in mind. You can fill in the rest as you go.</Text>
        </View>
        <Text style={styles.footer}>A clearer way to build a home.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 32, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 50 },
  wordmark: { color: colors.green, fontSize: 23, fontWeight: '800', letterSpacing: -1 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.green, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 43, lineHeight: 48, fontWeight: '700', letterSpacing: -1.7 },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: 12, marginBottom: 30 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, shadowColor: '#203628', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { color: colors.green, fontSize: 30, lineHeight: 34 },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 22 },
  button: { backgroundColor: colors.green, minHeight: 54, borderRadius: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  arrow: { color: colors.white, fontSize: 21 },
  tip: { borderLeftWidth: 2, borderLeftColor: '#a7c4ad', paddingLeft: 15, marginTop: 30 },
  tipLabel: { color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 7 },
  tipText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footer: { color: '#8b958d', fontSize: 12, textAlign: 'center', marginTop: 'auto', paddingTop: 42 },
});
