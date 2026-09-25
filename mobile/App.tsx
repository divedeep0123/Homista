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

import {
  createHomistaSession,
  createProject,
  getCurrentUser,
  getProjects,
  HomeProject,
  HomistaUser,
  ProjectDetails,
  revokeHomistaSession,
  updateProject,
} from './api';
import { confirmPhoneCode, sendPhoneCode, signOutFromFirebase } from './auth-provider';
import { clearSessionToken, readSessionToken, writeSessionToken } from './session-store';

type HomeType = NonNullable<HomeProject['home_type']>;
type ConstructionQuality = NonNullable<HomeProject['construction_quality']>;
type Screen = 'welcome' | 'phone' | 'code' | 'projects' | 'project-detail' | 'new-project' | 'edit-project';

const homeTypes: { value: HomeType; label: string }[] = [
  { value: 'villa', label: 'Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'apartment', label: 'Apartment' },
];

const constructionQualities: { value: ConstructionQuality; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

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
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [homeType, setHomeType] = useState<HomeType | null>(null);
  const [plotArea, setPlotArea] = useState('');
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [floors, setFloors] = useState('');
  const [constructionQuality, setConstructionQuality] = useState<ConstructionQuality | null>(null);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<HomeProject | null>(null);
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
          let ownedProjects: HomeProject[] = [];
          try {
            ownedProjects = await getProjects(token);
          } catch {
            if (mounted) setError('Your projects could not be loaded. Check your connection and try again.');
          }
          if (mounted) {
            setAccessToken(token);
            setUser(profile);
            setProjects(ownedProjects);
            setScreen('projects');
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
      try {
        setProjects(await getProjects(session.access_token));
      } catch {
        setError('Your account is ready, but your projects could not be loaded. Check your connection and try again.');
      }
      setScreen('projects');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That code could not be verified. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveProject = async () => {
    setError('');
    const normalizedName = projectName.trim();
    if (!normalizedName) {
      setError('Add a name for your project to continue.');
      return;
    }
    if (!accessToken) {
      setError('Your session expired. Sign in again to create a project.');
      setScreen('welcome');
      return;
    }
    const editingProject = screen === 'edit-project' ? selectedProject : null;
    if (screen === 'edit-project' && !editingProject) {
      setError('Choose a project before editing its details.');
      setScreen('projects');
      return;
    }
    const optionalInteger = (value: string, label: string, max: number): number | undefined | null => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
        setError(`${label} must be a whole number from 1 to ${max.toLocaleString()}.`);
        return null;
      }
      return parsed;
    };
    const plotAreaValue = optionalInteger(plotArea, 'Plot area', 10_000_000);
    const builtUpAreaValue = optionalInteger(builtUpArea, 'Built-up area', 10_000_000);
    const floorsValue = optionalInteger(floors, 'Floors', 100);
    if (plotAreaValue === null || builtUpAreaValue === null || floorsValue === null) return;
    const details: ProjectDetails = screen === 'edit-project'
      ? {
          name: normalizedName,
          location: projectLocation.trim() || null,
          home_type: homeType,
          plot_area_sqft: plotAreaValue ?? null,
          built_up_area_sqft: builtUpAreaValue ?? null,
          floors: floorsValue ?? null,
          construction_quality: constructionQuality,
        }
      : {
          name: normalizedName,
          ...(projectLocation.trim() ? { location: projectLocation.trim() } : {}),
          ...(homeType ? { home_type: homeType } : {}),
          ...(plotAreaValue ? { plot_area_sqft: plotAreaValue } : {}),
          ...(builtUpAreaValue ? { built_up_area_sqft: builtUpAreaValue } : {}),
          ...(floorsValue ? { floors: floorsValue } : {}),
          ...(constructionQuality ? { construction_quality: constructionQuality } : {}),
        };
    setBusy(true);
    try {
      const project = editingProject
        ? await updateProject(accessToken, editingProject.id, details)
        : await createProject(accessToken, details);
      setProjects((current) => editingProject
        ? current.map((item) => item.id === project.id ? project : item)
        : [project, ...current]);
      setSelectedProject(project);
      setProjectName('');
      setProjectLocation('');
      setHomeType(null);
      setPlotArea('');
      setBuiltUpArea('');
      setFloors('');
      setConstructionQuality(null);
      setScreen('project-detail');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not create that project. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reloadProjects = async () => {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      setProjects(await getProjects(accessToken));
    } catch {
      setError('Your projects could not be loaded. Check your connection and try again.');
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
      setProjectName('');
      setProjectLocation('');
      setHomeType(null);
      setPlotArea('');
      setBuiltUpArea('');
      setFloors('');
      setConstructionQuality(null);
      setSelectedProject(null);
      setProjects([]);
      setScreen('welcome');
      setBusy(false);
    }
  };

  const startNewProject = () => {
    setError('');
    setProjectName('');
    setProjectLocation('');
    setHomeType(null);
    setPlotArea('');
    setBuiltUpArea('');
    setFloors('');
    setConstructionQuality(null);
    setScreen('new-project');
  };

  const editSelectedProject = () => {
    if (!selectedProject) return;
    setError('');
    setProjectName(selectedProject.name);
    setProjectLocation(selectedProject.location || '');
    setHomeType(selectedProject.home_type);
    setPlotArea(selectedProject.plot_area_sqft?.toString() || '');
    setBuiltUpArea(selectedProject.built_up_area_sqft?.toString() || '');
    setFloors(selectedProject.floors?.toString() || '');
    setConstructionQuality(selectedProject.construction_quality);
    setScreen('edit-project');
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

        {screen === 'projects' && (
          <>
            <Text style={styles.eyebrow}>YOUR HOMISTA WORKSPACE</Text>
            <Text style={styles.title}>Your home{'\n'}projects.</Text>
            <Text style={styles.subtitle}>Keep each build’s plans and next steps together.</Text>
            {error ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={reloadProjects} style={styles.retryButton}>
                  <Text style={styles.textButtonLabel}>{busy ? 'Loading…' : 'Try again'}</Text>
                </Pressable>
              </>
            ) : null}
            {projects.length === 0 ? (
              <View style={styles.card}>
                <View style={styles.icon}><Text style={styles.iconText}>⌂</Text></View>
                <Text style={styles.cardTitle}>Start with your first project</Text>
                <Text style={styles.cardBody}>Add a name and location. You can fill in the rest as your home takes shape.</Text>
              <ActionButton label="Create a project" onPress={startNewProject} />
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your projects</Text>
                  <Text style={styles.projectCount}>{projects.length}</Text>
                </View>
                {projects.map((project) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${project.name}`}
                    key={project.id}
                    onPress={() => { setSelectedProject(project); setScreen('project-detail'); }}
                    style={({ pressed }) => [styles.projectCard, pressed && styles.projectCardPressed]}
                  >
                    <View style={styles.projectIcon}><Text style={styles.projectIconText}>⌂</Text></View>
                    <View style={styles.projectCopy}>
                      <Text style={styles.projectName}>{project.name}</Text>
                      <Text style={styles.projectLocation}>
                        {[project.home_type ? homeTypes.find((item) => item.value === project.home_type)?.label : null, project.location || 'Location not added']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.projectArrow}>›</Text>
                  </Pressable>
                ))}
                <ActionButton label="Create another project" onPress={startNewProject} />
              </>
            )}
            <Pressable accessibilityRole="button" disabled={busy} onPress={signOut} style={styles.textButton}>
              {busy ? <ActivityIndicator color={colors.green} /> : <Text style={styles.textButtonLabel}>Sign out{user?.phone_number ? ` · ${user.phone_number}` : ''}</Text>}
            </Pressable>
          </>
        )}

        {screen === 'project-detail' && selectedProject && (
          <>
            <Pressable accessibilityRole="button" onPress={() => setScreen('projects')} style={styles.backLink}>
              <Text style={styles.textButtonLabel}>‹ All projects</Text>
            </Pressable>
            <Text style={styles.eyebrow}>PROJECT COMMAND CENTER</Text>
            <Text style={styles.title}>{selectedProject.name}</Text>
            <Text style={styles.subtitle}>{selectedProject.location || 'Add a location to personalize your project.'}</Text>
            <View style={styles.profileCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Home profile</Text>
                <Text style={styles.projectCount}>{projectProfileProgress(selectedProject)}% complete</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${projectProfileProgress(selectedProject)}%` }]} />
              </View>
              <DetailRow label="Home type" value={homeTypeLabel(selectedProject.home_type)} />
              <DetailRow label="Plot area" value={formatArea(selectedProject.plot_area_sqft)} />
              <DetailRow label="Built-up area" value={formatArea(selectedProject.built_up_area_sqft)} />
              <DetailRow label="Floors" value={selectedProject.floors?.toString() || 'Not added'} />
              <DetailRow label="Construction quality" value={qualityLabel(selectedProject.construction_quality)} last />
              <ActionButton
                label={projectProfileProgress(selectedProject) === 100 ? 'Edit home details' : 'Add home details'}
                onPress={editSelectedProject}
              />
            </View>
            <View style={styles.nextStepCard}>
              <Text style={styles.label}>NEXT UP</Text>
              <Text style={styles.cardTitle}>Cost and materials estimate</Text>
              <Text style={styles.cardBody}>Complete the home profile first. Then Homista can prepare a clear estimate with quantities and assumptions.</Text>
            </View>
          </>
        )}

        {(screen === 'new-project' || screen === 'edit-project') && (
          <ProjectEditor
            title={screen === 'edit-project' ? 'Update home details' : 'Create your project'}
            name={projectName}
            setName={setProjectName}
            location={projectLocation}
            setLocation={setProjectLocation}
            homeType={homeType}
            setHomeType={setHomeType}
            plotArea={plotArea}
            setPlotArea={setPlotArea}
            builtUpArea={builtUpArea}
            setBuiltUpArea={setBuiltUpArea}
            floors={floors}
            setFloors={setFloors}
            constructionQuality={constructionQuality}
            setConstructionQuality={setConstructionQuality}
            error={error}
            busy={busy}
            saveLabel={screen === 'edit-project' ? 'Save home details' : 'Create project'}
            onSave={saveProject}
            onCancel={() => { setError(''); setScreen(screen === 'edit-project' ? 'project-detail' : 'projects'); }}
          />
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

type ProjectEditorProps = {
  title: string;
  name: string;
  setName: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  homeType: HomeType | null;
  setHomeType: (value: HomeType | null) => void;
  plotArea: string;
  setPlotArea: (value: string) => void;
  builtUpArea: string;
  setBuiltUpArea: (value: string) => void;
  floors: string;
  setFloors: (value: string) => void;
  constructionQuality: ConstructionQuality | null;
  setConstructionQuality: (value: ConstructionQuality | null) => void;
  error: string;
  busy: boolean;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
};

function ProjectEditor(props: ProjectEditorProps) {
  return (
    <>
      <Text style={styles.eyebrow}>HOME PROJECT</Text>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.subtitle}>Add what you know now. You can update these details later.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>PROJECT NAME</Text>
        <TextInput
          accessibilityLabel="Project name"
          autoCapitalize="words"
          maxLength={120}
          onChangeText={props.setName}
          placeholder="e.g. Family home"
          placeholderTextColor="#9aa39c"
          style={styles.input}
          value={props.name}
        />
        <Text style={[styles.label, styles.locationLabel]}>LOCATION (OPTIONAL)</Text>
        <TextInput
          accessibilityLabel="Project location"
          autoCapitalize="words"
          maxLength={160}
          onChangeText={props.setLocation}
          placeholder="City or area"
          placeholderTextColor="#9aa39c"
          style={styles.input}
          value={props.location}
        />

        <Text style={[styles.label, styles.locationLabel]}>HOME TYPE</Text>
        <View style={styles.choiceRow}>
          {homeTypes.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: props.homeType === option.value }}
              key={option.value}
              onPress={() => props.setHomeType(props.homeType === option.value ? null : option.value)}
              style={[styles.choice, props.homeType === option.value && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, props.homeType === option.value && styles.choiceTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={[styles.label, styles.locationLabel]}>PLOT AREA (SQ FT)</Text>
            <TextInput
              accessibilityLabel="Plot area in square feet"
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={props.setPlotArea}
              placeholder="e.g. 1200"
              placeholderTextColor="#9aa39c"
              style={styles.input}
              value={props.plotArea}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={[styles.label, styles.locationLabel]}>BUILT-UP (SQ FT)</Text>
            <TextInput
              accessibilityLabel="Built-up area in square feet"
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={props.setBuiltUpArea}
              placeholder="e.g. 2400"
              placeholderTextColor="#9aa39c"
              style={styles.input}
              value={props.builtUpArea}
            />
          </View>
        </View>

        <Text style={[styles.label, styles.locationLabel]}>NUMBER OF FLOORS</Text>
        <TextInput
          accessibilityLabel="Number of floors"
          keyboardType="number-pad"
          maxLength={3}
          onChangeText={props.setFloors}
          placeholder="e.g. 2"
          placeholderTextColor="#9aa39c"
          style={styles.input}
          value={props.floors}
        />

        <Text style={[styles.label, styles.locationLabel]}>CONSTRUCTION QUALITY</Text>
        <View style={styles.choiceRow}>
          {constructionQualities.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: props.constructionQuality === option.value }}
              key={option.value}
              onPress={() => props.setConstructionQuality(props.constructionQuality === option.value ? null : option.value)}
              style={[styles.choice, styles.choiceWide, props.constructionQuality === option.value && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, props.constructionQuality === option.value && styles.choiceTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {props.error ? <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text> : null}
        <ActionButton label={props.saveLabel} loading={props.busy} onPress={props.onSave} />
        <Pressable accessibilityRole="button" disabled={props.busy} onPress={props.onCancel} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Cancel</Text>
        </Pressable>
      </View>
    </>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function projectProfileProgress(project: HomeProject): number {
  const fields = [project.location, project.home_type, project.plot_area_sqft, project.built_up_area_sqft, project.floors, project.construction_quality];
  return Math.round((fields.filter((value) => value !== null && value !== undefined && value !== '').length / fields.length) * 100);
}

function homeTypeLabel(value: HomeProject['home_type']): string {
  return homeTypes.find((option) => option.value === value)?.label || 'Not added';
}

function qualityLabel(value: HomeProject['construction_quality']): string {
  return constructionQualities.find((option) => option.value === value)?.label || 'Not added';
}

function formatArea(value: number | null): string {
  return value ? `${new Intl.NumberFormat('en-IN').format(value)} sq ft` : 'Not added';
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  projectCount: { color: colors.green, fontSize: 13, fontWeight: '700', backgroundColor: colors.paleGreen, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  projectCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#edf0ec' },
  projectCardPressed: { opacity: 0.78 },
  projectIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  projectIconText: { color: colors.green, fontSize: 27, lineHeight: 30 },
  projectCopy: { flex: 1 },
  projectName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  projectLocation: { color: colors.muted, fontSize: 12, marginTop: 4 },
  projectArrow: { color: colors.green, fontSize: 26, marginLeft: 12 },
  backLink: { alignSelf: 'flex-start', paddingBottom: 18 },
  profileCard: { backgroundColor: colors.white, borderRadius: 24, padding: 22, shadowColor: '#203628', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: '#edf1ed', marginTop: 2, marginBottom: 12 },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: colors.green },
  detailRow: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#edf0ec', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { color: colors.muted, fontSize: 13 },
  detailValue: { color: colors.ink, fontSize: 13, fontWeight: '600', textAlign: 'right', marginLeft: 12 },
  nextStepCard: { backgroundColor: colors.paleGreen, borderRadius: 20, padding: 20, marginTop: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start' },
  fieldHalf: { flex: 1, marginRight: 8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap' },
  choice: { minHeight: 44, borderWidth: 1, borderColor: '#dfe5df', borderRadius: 13, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginRight: 8, marginBottom: 4 },
  choiceWide: { flexGrow: 1 },
  choiceSelected: { backgroundColor: colors.paleGreen, borderColor: colors.green },
  choiceText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  choiceTextSelected: { color: colors.green },
  locationLabel: { marginTop: 20 },
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
  retryButton: { alignItems: 'flex-start', paddingTop: 10, paddingBottom: 16 },
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
