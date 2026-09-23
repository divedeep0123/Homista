import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createHomistaSession, getCurrentUser, HomistaUser, revokeHomistaSession } from './api';
import { confirmPhoneCode, sendPhoneCode, signOutFromFirebase } from './auth-provider';
import { clearSessionToken, readSessionToken, writeSessionToken } from './session-store';

type Screen = 'welcome' | 'phone' | 'code' | 'signed-in';

const colors = {
  background: '#f7f8f5',
  ink: '#1e2922',
  muted: '#68746b',
  green: '#286445',
  paleGreen: '#e7efe8',
  white: '#ffffff',
  danger: '#a43d36',
};

const firebaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID &&
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
);

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [user, setUser] = useState<HomistaUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    readSessionToken()
      .then(async (token) => {
        if (!token) return;
        try {
          const profile = await getCurrentUser(token);
          if (mounted) {
            setAccessToken(token);
            setUser(profile);
            setScreen('signed-in');
          }
        } catch {
          await clearSessionToken();
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const sendCode = async () => {
    setError('');
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setError('Enter your phone number in international format, such as +919876543210.');
      return;
    }
    if (!firebaseConfigured) {
      setError('Firebase is not set up yet. Add your Firebase web app settings to mobile/.env first.');
      return;
    }
    setBusy(true);
    try {
      await sendPhoneCode(phone.trim());
      setScreen('code');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not send a code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }
    setBusy(true);
    try {
      const firebaseIdToken = await confirmPhoneCode(code.trim());
      const session = await createHomistaSession(firebaseIdToken);
      await writeSessionToken(session.access_token);
      setAccessToken(session.access_token);
      setUser(session.user);
      setScreen('signed-in');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That code could not be verified. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      if (accessToken) await revokeHomistaSession(accessToken);
    } catch {
      // Clear local credentials even when the API is temporarily unreachable.
    } finally {
      await Promise.all([clearSessionToken(), signOutFromFirebase().catch(() => undefined)]);
      setAccessToken(null);
      setUser(null);
      setPhone('');
      setCode('');
      setScreen('welcome');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.wordmark}>homista</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>H</Text></View>
        </View>

        {screen === 'welcome' && (
          <>
            <Text style={styles.eyebrow}>YOUR HOME JOURNEY</Text>
            <Text style={styles.title}>Build with{'\n'}confidence.</Text>
            <Text style={styles.subtitle}>Your home project, in one place.</Text>
            <View style={styles.card}>
              <View style={styles.icon}><Text style={styles.iconText}>⌂</Text></View>
              <Text style={styles.cardTitle}>Your first project starts here</Text>
              <Text style={styles.cardBody}>Bring your plans, budget, and next steps together as you build your home.</Text>
              <ActionButton label="Continue with phone" onPress={() => { setError(''); setScreen('phone'); }} />
            </View>
            <Tip />
          </>
        )}

        {screen === 'phone' && (
          <>
            <Text style={styles.eyebrow}>SECURE SIGN IN</Text>
            <Text style={styles.title}>Your phone,{'\n'}your projects.</Text>
            <Text style={styles.subtitle}>We’ll text you a one-time code to get started.</Text>
            <View style={styles.card}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                accessibilityLabel="Phone number"
                autoComplete="tel"
                autoCapitalize="none"
                keyboardType="phone-pad"
                maxLength={18}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor="#9aa39c"
                style={styles.input}
                value={phone}
              />
              <Text style={styles.inputHint}>Include your country code, for example +91.</Text>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <ActionButton label="Send verification code" loading={busy} onPress={sendCode} />
              <Pressable accessibilityRole="button" onPress={() => { setError(''); setScreen('welcome'); }} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Back</Text>
              </Pressable>
            </View>
            <View nativeID="homista-recaptcha" style={styles.recaptcha} />
            <Text style={styles.privacy}>By continuing, you agree to receive a one-time SMS verification code.</Text>
          </>
        )}

        {screen === 'code' && (
          <>
            <Text style={styles.eyebrow}>PHONE VERIFICATION</Text>
            <Text style={styles.title}>Check your{'\n'}messages.</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}.</Text>
            <View style={styles.card}>
              <Text style={styles.label}>VERIFICATION CODE</Text>
              <TextInput
                accessibilityLabel="Verification code"
                autoComplete="sms-otp"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setCode}
                placeholder="••••••"
                placeholderTextColor="#9aa39c"
                style={[styles.input, styles.codeInput]}
                value={code}
              />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <ActionButton label="Verify and continue" loading={busy} onPress={verifyCode} />
              <Pressable accessibilityRole="button" onPress={() => { setError(''); setCode(''); setScreen('phone'); }} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Use a different number</Text>
              </Pressable>
            </View>
            <View nativeID="homista-recaptcha" style={styles.recaptcha} />
          </>
        )}

        {screen === 'signed-in' && (
          <>
            <Text style={styles.eyebrow}>WELCOME TO HOMISTA</Text>
            <Text style={styles.title}>You’re in.</Text>
            <Text style={styles.subtitle}>{user?.display_name || user?.phone_number || 'Your Homista account is ready.'}</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your home project starts here</Text>
              <Text style={styles.cardBody}>Your account is set up. Project planning tools are the next part of your Homista workspace.</Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={signOut} style={styles.secondaryButton}>
                {busy ? <ActivityIndicator color={colors.green} /> : <Text style={styles.secondaryButtonText}>Sign out</Text>}
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.footer}>A clearer way to build a home.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, loading = false, onPress }: { label: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, pressed && !loading && styles.buttonPressed, loading && styles.buttonDisabled]}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{label}</Text>}
      {!loading && <Text style={styles.arrow}>→</Text>}
    </Pressable>
  );
}

function Tip() {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipLabel}>A GOOD PLACE TO BEGIN</Text>
      <Text style={styles.tipText}>Start with your plot size and the home you have in mind. You can fill in the rest as you go.</Text>
    </View>
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
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 12, marginBottom: 30 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, shadowColor: '#203628', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { color: colors.green, fontSize: 30, lineHeight: 34 },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 22 },
  label: { color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 9 },
  input: { height: 54, borderWidth: 1, borderColor: '#dfe5df', borderRadius: 14, paddingHorizontal: 15, color: colors.ink, fontSize: 16, backgroundColor: '#fff' },
  codeInput: { fontSize: 25, letterSpacing: 8, textAlign: 'center' },
  inputHint: { color: colors.muted, fontSize: 12, marginTop: 8, marginBottom: 18 },
  button: { backgroundColor: colors.green, minHeight: 54, borderRadius: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.75 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  arrow: { color: colors.white, fontSize: 21 },
  textButton: { alignItems: 'center', paddingTop: 18, paddingBottom: 2 },
  textButtonLabel: { color: colors.green, fontSize: 14, fontWeight: '600' },
  secondaryButton: { minHeight: 48, borderWidth: 1, borderColor: '#cbd9cd', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.green, fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 12 },
  privacy: { color: '#818b83', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 20, paddingHorizontal: 12 },
  recaptcha: { width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  tip: { borderLeftWidth: 2, borderLeftColor: '#a7c4ad', paddingLeft: 15, marginTop: 30 },
  tipLabel: { color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 7 },
  tipText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footer: { color: '#8b958d', fontSize: 12, textAlign: 'center', marginTop: 'auto', paddingTop: 42 },
});
