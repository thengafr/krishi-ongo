import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Circle } from "react-native-maps";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoginScreen from "./LoginScreen";
import { apiFetch } from "./api";

const SESSION_KEY = "krishiongo_session";
const NEARBY_RADIUS_KM = 50;
const DEFAULT_REGION = {
  latitude: 10.8505,
  longitude: 76.2711,
  latitudeDelta: 1.7,
  longitudeDelta: 1.7,
};

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [page, setPage] = useState("home");

  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Location not available");
  const locationSubscription = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [workerApplications, setWorkerApplications] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [job, setJob] = useState({
    workType: "Coconut Harvesting",
    workersRequired: "3",
    date: "2026-09-28",
    duration: "1 day",
  });

  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    skills: "",
    experience: "0",
  });

  useEffect(() => {
    restoreSession();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !token) return;
    startLocationTracking();
    loadProfile();
  }, [user?.id, token]);

  async function restoreSession() {
    try {
      const stored = await AsyncStorage.getItem(SESSION_KEY);
      if (!stored) return;
      const session = JSON.parse(stored);
      if (session?.user && session?.token) {
        setUser(session.user);
        setToken(session.token);
        setPage(session.user.role === "farmer" ? "farmer" : "worker");
      }
    } catch (error) {
      console.log("SESSION RESTORE ERROR", error);
    }
  }

  async function handleLogin(loggedInUser, loggedInToken) {
    setUser(loggedInUser);
    setToken(loggedInToken);
    setPage(loggedInUser.role === "farmer" ? "farmer" : "worker");
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ user: loggedInUser, token: loggedInToken })
    );
  }

  async function logout() {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    setToken(null);
    setCurrentLocation(null);
    setPage("home");
  }

  async function updateLocationOnServer(latitude, longitude) {
    if (!user?.id || !token) return;
    try {
      await apiFetch(
        `/location/${user.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ latitude, longitude }),
        },
        token
      );
      setLocationStatus("Location tracking active");
    } catch (error) {
      console.log("LOCATION UPLOAD ERROR", error);
      setLocationStatus("GPS active; sync failed");
    }
  }

  async function startLocationTracking() {
    if (!user?.id) return;
    try {
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        setLocationStatus("Turn on GPS");
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("Location permission denied");
        return;
      }

      const first = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const firstLocation = {
        latitude: first.coords.latitude,
        longitude: first.coords.longitude,
      };
      setCurrentLocation(firstLocation);
      await updateLocationOnServer(firstLocation.latitude, firstLocation.longitude);

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000,
          distanceInterval: 30,
        },
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(location);
          await updateLocationOnServer(location.latitude, location.longitude);
        }
      );
    } catch (error) {
      console.log("GPS ERROR", error);
      setLocationStatus("Unable to get location");
    }
  }

  async function loadProfile() {
    if (!user?.id || !token) return;
    try {
      const data = await apiFetch(`/profile/${user.id}`, {}, token);
      setUser(data.user);
      setProfile({
        name: data.user.name || "",
        phone: data.user.phone || "",
        email: data.user.email || "",
        skills: (data.user.skills || []).join(", "),
        experience: String(data.user.experience || 0),
      });
      await AsyncStorage.mergeItem(
        SESSION_KEY,
        JSON.stringify({ user: data.user })
      );
    } catch (error) {
      console.log("PROFILE LOAD ERROR", error);
    }
  }

  async function saveProfile() {
    try {
      setProfileLoading(true);
      const data = await apiFetch(
        `/profile/${user.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: profile.name.trim(),
            phone: profile.phone.trim(),
            email: profile.email.trim(),
            skills: profile.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            experience: Number(profile.experience || 0),
          }),
        },
        token
      );
      setUser(data.user);
      await AsyncStorage.mergeItem(
        SESSION_KEY,
        JSON.stringify({ user: data.user })
      );
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (error) {
      Alert.alert("Profile", error.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadJobs() {
    try {
      setLoading(true);
      const data = await apiFetch(`/jobs/farmer/${user.id}`, {}, token);
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Jobs", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadNearbyJobs() {
    try {
      setLoading(true);
      const data = await apiFetch("/jobs/open", {}, token);
      const source = Array.isArray(data) ? data : [];

      if (!currentLocation) {
        setNearbyJobs(source);
        return;
      }

      const filtered = source
        .map((item) => {
          const lat = Number(item.location?.latitude);
          const lon = Number(item.location?.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lon)) return { ...item, distance: null };
          return {
            ...item,
            distance: distanceKm(
              currentLocation.latitude,
              currentLocation.longitude,
              lat,
              lon
            ),
          };
        })
        .filter((item) => item.distance == null || item.distance <= NEARBY_RADIUS_KM)
        .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));

      setNearbyJobs(filtered);
    } catch (error) {
      Alert.alert("Nearby Jobs", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createJob() {
    if (!job.workType || !job.date) {
      Alert.alert("Job", "Enter work type and date.");
      return;
    }
    if (!currentLocation) {
      Alert.alert("Location", "Allow GPS before creating a job.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch(
        "/jobs",
        {
          method: "POST",
          body: JSON.stringify({
            farmerId: user.id,
            workType: job.workType,
            workersRequired: Number(job.workersRequired || 1),
            date: job.date,
            duration: job.duration,
            location: currentLocation,
          }),
        },
        token
      );

      setJobs((previous) => [data, ...previous]);
      Alert.alert("Success 🌱", "Job created at your current location.");
      setPage("myJobs");
    } catch (error) {
      Alert.alert("Create Job", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function findWorkers(jobId) {
    try {
      setLoading(true);
      const data = await apiFetch(`/matches/${jobId}`, {}, token);
      setMatches(data.matches || []);
      setSelectedJobId(jobId);
      setPage("matches");
    } catch (error) {
      Alert.alert("Matching", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications(jobId) {
    try {
      setLoading(true);
      const data = await apiFetch(`/applications/job/${jobId}`, {}, token);
      setApplications(Array.isArray(data) ? data : []);
      setSelectedJobId(jobId);
      setPage("applications");
    } catch (error) {
      Alert.alert("Applications", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateApplicationStatus(applicationId, status) {
    try {
      setLoading(true);
      await apiFetch(
        `/applications/${applicationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        token
      );
      setApplications((previous) =>
        previous.map((item) =>
          item._id === applicationId ? { ...item, status } : item
        )
      );
      Alert.alert("Updated", status === "accepted" ? "Worker accepted." : "Worker rejected.");
    } catch (error) {
      Alert.alert("Application", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyForJob(jobId) {
    try {
      setLoading(true);
      await apiFetch(
        "/applications",
        {
          method: "POST",
          body: JSON.stringify({ jobId, workerId: user.id }),
        },
        token
      );
      Alert.alert("Success 🌱", "Application submitted successfully.");
    } catch (error) {
      Alert.alert("Application", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkerApplications() {
    try {
      setLoading(true);
      const data = await apiFetch(`/applications/worker/${user.id}`, {}, token);
      setWorkerApplications(Array.isArray(data) ? data : []);
      setPage("workerApplications");
    } catch (error) {
      Alert.alert("Applications", error.message);
    } finally {
      setLoading(false);
    }
  }

  const region = useMemo(() => {
    if (!currentLocation) return DEFAULT_REGION;
    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [currentLocation]);

  function openMap() {
    setPage("map");
  }

  function openProfile() {
    setProfile({
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
      skills: (user.skills || []).join(", "),
      experience: String(user.experience || 0),
    });
    setPage("profile");
  }

  const Header = ({ title, backPage }) => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>🌱 KrishiOnGo</Text>
        <Text style={styles.headerSubtitle}>{title}</Text>
      </View>
      {backPage && (
        <Pressable style={styles.headerButton} onPress={() => setPage(backPage)}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </Pressable>
      )}
      <Pressable style={[styles.headerButton, styles.logoutButton]} onPress={logout}>
        <Text style={styles.headerButtonText}>Logout</Text>
      </Pressable>
    </View>
  );

  const LocationBox = () => (
    <View style={styles.locationBox}>
      <Text style={styles.locationTitle}>📍 Current Location</Text>
      {currentLocation ? (
        <>
          <Text style={styles.smallText}>Latitude: {currentLocation.latitude.toFixed(6)}</Text>
          <Text style={styles.smallText}>Longitude: {currentLocation.longitude.toFixed(6)}</Text>
          <Text style={styles.locationStatus}>🟢 {locationStatus}</Text>
        </>
      ) : (
        <Text style={styles.smallText}>📡 {locationStatus}</Text>
      )}
    </View>
  );

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (page === "farmer") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Farmer Dashboard" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Welcome, {user.name}! 👨‍🌾</Text>
          <Text style={styles.subtitle}>Find and manage agricultural workers.</Text>
          <LocationBox />

          <Pressable style={styles.card} onPress={() => setPage("createJob")}>
            <Text style={styles.cardIcon}>➕</Text>
            <Text style={styles.cardTitle}>Create New Job</Text>
            <Text style={styles.cardDescription}>Post a requirement using your current GPS location.</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => { loadJobs(); setPage("myJobs"); }}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>My Jobs</Text>
            <Text style={styles.cardDescription}>See your posted jobs and applicants.</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={openMap}>
            <Text style={styles.cardIcon}>🗺️</Text>
            <Text style={styles.cardTitle}>Map</Text>
            <Text style={styles.cardDescription}>View your location and job locations.</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={openProfile}>
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>My Profile</Text>
            <Text style={styles.cardDescription}>Update your account information.</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "worker") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Worker Dashboard" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Welcome, {user.name}! 👷</Text>
          <Text style={styles.subtitle}>Find agricultural work near you.</Text>
          <LocationBox />

          <Pressable style={styles.card} onPress={() => { loadNearbyJobs(); setPage("nearbyJobs"); }}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={styles.cardTitle}>Nearby Jobs</Text>
            <Text style={styles.cardDescription}>Jobs within {NEARBY_RADIUS_KM} km of your location.</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={loadWorkerApplications}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>My Applications</Text>
            <Text style={styles.cardDescription}>Track your applications and status.</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={openMap}>
            <Text style={styles.cardIcon}>🗺️</Text>
            <Text style={styles.cardTitle}>Map</Text>
            <Text style={styles.cardDescription}>See your location and nearby job markers.</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={openProfile}>
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>My Profile</Text>
            <Text style={styles.cardDescription}>Manage skills, experience and contact details.</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "createJob") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Create Job" backPage="farmer" />
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.heading}>📝 New Agricultural Job</Text>
          <LocationBox />

          <Text style={styles.label}>Type of Work</Text>
          <TextInput style={styles.input} value={job.workType} onChangeText={(value) => setJob({ ...job, workType: value })} />

          <Text style={styles.label}>Workers Required</Text>
          <TextInput style={styles.input} value={job.workersRequired} onChangeText={(value) => setJob({ ...job, workersRequired: value })} keyboardType="numeric" />

          <Text style={styles.label}>Work Date</Text>
          <TextInput style={styles.input} value={job.date} onChangeText={(value) => setJob({ ...job, date: value })} placeholder="YYYY-MM-DD" />

          <Text style={styles.label}>Duration</Text>
          <TextInput style={styles.input} value={job.duration} onChangeText={(value) => setJob({ ...job, duration: value })} />

          <Text style={styles.label}>GPS</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={currentLocation ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : "Waiting for GPS..."} editable={false} />

          <Pressable style={styles.primaryButton} onPress={createJob} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>🌱 Create Job at My Location</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "myJobs") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="My Jobs" backPage="farmer" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>📋 My Jobs</Text>
          {loading ? <ActivityIndicator size="large" color="#2E7D32" /> : jobs.length === 0 ? (
            <Empty title="No jobs yet" text="Create your first agricultural job." />
          ) : jobs.map((item) => (
            <View key={item._id} style={styles.listCard}>
              <Text style={styles.cardTitle}>{item.workType}</Text>
              <Text style={styles.smallText}>👷 Workers: {item.workersRequired}</Text>
              <Text style={styles.smallText}>📅 {item.date}</Text>
              <Text style={styles.smallText}>📍 {item.location?.latitude}, {item.location?.longitude}</Text>
              <Text style={styles.smallText}>🟢 {item.status}</Text>
              <Pressable style={styles.primaryButton} onPress={() => findWorkers(item._id)}>
                <Text style={styles.primaryText}>🔎 Find Workers</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => loadApplications(item._id)}>
                <Text style={styles.secondaryText}>📋 View Applications</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "matches") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Suitable Workers" backPage="myJobs" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>🔎 Matching Workers</Text>
          {matches.length === 0 ? <Empty title="No suitable workers" text="Try again after more workers register or update their skills." /> : matches.map((worker) => (
            <View key={worker.workerId || worker._id} style={styles.listCard}>
              <Text style={styles.cardTitle}>👷 {worker.name}</Text>
              <Text style={styles.smallText}>🌱 Skills: {worker.skills?.join(", ") || "Not provided"}</Text>
              <Text style={styles.smallText}>⭐ Experience: {worker.experience ?? 0} years</Text>
              <Text style={styles.smallText}>📍 Distance: {worker.distance ?? "—"} km</Text>
              <Text style={styles.score}>🎯 Match Score: {worker.matchScore ?? "—"}%</Text>
              <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(`tel:${worker.phone}`)}>
                <Text style={styles.primaryText}>📞 Contact</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "applications") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Applications" backPage="myJobs" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>📋 Worker Applications</Text>
          {applications.length === 0 ? <Empty title="No applications" text="Workers have not applied yet." /> : applications.map((application) => (
            <View key={application._id} style={styles.listCard}>
              <Text style={styles.cardTitle}>👷 {application.workerId?.name}</Text>
              <Text style={styles.smallText}>🌱 {application.workerId?.skills?.join(", ") || "No skills"}</Text>
              <Text style={styles.smallText}>⭐ {application.workerId?.experience ?? 0} years experience</Text>
              <Text style={styles.smallText}>📱 {application.workerId?.phone}</Text>
              <Text style={styles.smallText}>📌 Status: {application.status}</Text>
              {application.status === "pending" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={() => updateApplicationStatus(application._id, "accepted")}>
                    <Text style={styles.primaryText}>✅ Accept</Text>
                  </Pressable>
                  <Pressable style={[styles.dangerButton, { flex: 1 }]} onPress={() => updateApplicationStatus(application._id, "rejected")}>
                    <Text style={styles.primaryText}>❌ Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "nearbyJobs") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Nearby Jobs" backPage="worker" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>📍 Jobs Near You</Text>
          <Text style={styles.subtitle}>Showing jobs within {NEARBY_RADIUS_KM} km when coordinates are available.</Text>
          {loading ? <ActivityIndicator size="large" color="#2E7D32" /> : nearbyJobs.length === 0 ? <Empty title="No nearby jobs" text="Create/open jobs near your current location to see them here." /> : nearbyJobs.map((item) => (
            <View key={item._id} style={styles.listCard}>
              <Text style={styles.cardTitle}>🌱 {item.workType}</Text>
              <Text style={styles.smallText}>📅 {item.date}</Text>
              <Text style={styles.smallText}>👷 Workers: {item.workersRequired}</Text>
              <Text style={styles.smallText}>⏱️ {item.duration}</Text>
              <Text style={styles.smallText}>📍 {item.location?.latitude}, {item.location?.longitude}</Text>
              {item.distance != null && <Text style={styles.score}>📏 {item.distance.toFixed(1)} km away</Text>}
              <Pressable style={styles.primaryButton} onPress={() => applyForJob(item._id)}>
                <Text style={styles.primaryText}>✅ Apply for Job</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "workerApplications") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="My Applications" backPage="worker" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>📋 My Applications</Text>
          {workerApplications.length === 0 ? <Empty title="No applications yet" text="Apply for an agricultural job to see it here." /> : workerApplications.map((application) => (
            <View key={application._id} style={styles.listCard}>
              <Text style={styles.cardTitle}>🌱 {application.jobId?.workType}</Text>
              <Text style={styles.smallText}>📅 {application.jobId?.date}</Text>
              <Text style={styles.smallText}>⏱️ {application.jobId?.duration}</Text>
              <Text style={styles.smallText}>📌 Status: {application.status}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (page === "map") {
    const jobMarkers = user.role === "worker" ? nearbyJobs : jobs;
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="KrishiOnGo Map" backPage={user.role === "farmer" ? "farmer" : "worker"} />
        <View style={{ flex: 1 }}>
          <MapView style={{ flex: 1 }} initialRegion={region} showsUserLocation>
            {currentLocation && (
              <>
                <Marker coordinate={currentLocation} title="My Location" pinColor="#2E7D32" />
                <Circle center={currentLocation} radius={NEARBY_RADIUS_KM * 1000} strokeColor="#2E7D32" fillColor="rgba(46,125,50,0.08)" />
              </>
            )}
            {jobMarkers.map((item) => {
              const lat = Number(item.location?.latitude);
              const lon = Number(item.location?.longitude);
              if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
              return (
                <Marker
                  key={item._id}
                  coordinate={{ latitude: lat, longitude: lon }}
                  title={item.workType}
                  description={`${item.date || ""} • ${item.duration || ""}`}
                />
              );
            })}
          </MapView>
          <View style={styles.mapBottomCard}>
            <Text style={styles.cardTitle}>📍 {locationStatus}</Text>
            {currentLocation && (
              <Text style={styles.smallText}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (page === "profile") {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="My Profile" backPage={user.role === "farmer" ? "farmer" : "worker"} />
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.heading}>👤 Profile</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={profile.name} onChangeText={(value) => setProfile({ ...profile, name: value })} />
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={profile.phone} onChangeText={(value) => setProfile({ ...profile, phone: value })} keyboardType="phone-pad" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={profile.email} onChangeText={(value) => setProfile({ ...profile, email: value })} keyboardType="email-address" autoCapitalize="none" />
          {user.role === "worker" && (
            <>
              <Text style={styles.label}>Skills</Text>
              <TextInput style={styles.input} value={profile.skills} onChangeText={(value) => setProfile({ ...profile, skills: value })} placeholder="coconut harvesting, farm cleaning" />
              <Text style={styles.label}>Experience (years)</Text>
              <TextInput style={styles.input} value={profile.experience} onChangeText={(value) => setProfile({ ...profile, experience: value })} keyboardType="numeric" />
            </>
          )}
          <LocationBox />
          <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={profileLoading}>
            {profileLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save Profile</Text>}
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={logout}>
            <Text style={styles.primaryText}>Logout</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

function Empty({ title, text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FFF5" },
  content: { padding: 20, paddingBottom: 50 },
  form: { padding: 20, paddingBottom: 60 },
  header: { padding: 14, backgroundColor: "#2E7D32", flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSubtitle: { color: "#E8F5E9", marginTop: 2 },
  headerButton: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  headerButtonText: { color: "#2E7D32", fontWeight: "800" },
  logoutButton: { marginLeft: 2 },
  heading: { fontSize: 26, fontWeight: "800", color: "#1B5E20", marginBottom: 8 },
  subtitle: { color: "#666", fontSize: 15, marginBottom: 18 },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 18, marginBottom: 16, elevation: 3 },
  cardIcon: { fontSize: 34, marginBottom: 8 },
  cardTitle: { fontSize: 19, fontWeight: "800", color: "#1B5E20", marginBottom: 6 },
  cardDescription: { color: "#666", lineHeight: 20 },
  listCard: { backgroundColor: "#fff", padding: 18, borderRadius: 16, marginBottom: 16, elevation: 3 },
  locationBox: { backgroundColor: "#E8F5E9", padding: 15, borderRadius: 15, marginBottom: 18, borderWidth: 1, borderColor: "#C8E6C9" },
  locationTitle: { fontWeight: "800", color: "#1B5E20", marginBottom: 6 },
  locationStatus: { color: "#2E7D32", fontWeight: "700", marginTop: 5 },
  smallText: { color: "#444", marginBottom: 5 },
  label: { fontWeight: "700", color: "#333", marginTop: 12, marginBottom: 7 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#C8E6C9", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  disabledInput: { backgroundColor: "#F0F0F0", color: "#555" },
  primaryButton: { backgroundColor: "#2E7D32", paddingVertical: 13, borderRadius: 11, alignItems: "center", marginTop: 12 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondaryButton: { backgroundColor: "#E8F5E9", paddingVertical: 13, borderRadius: 11, alignItems: "center", marginTop: 10 },
  secondaryText: { color: "#2E7D32", fontWeight: "800" },
  dangerButton: { backgroundColor: "#C62828", paddingVertical: 13, borderRadius: 11, alignItems: "center", marginTop: 10 },
  score: { color: "#E65100", fontWeight: "800", marginTop: 4 },
  empty: { backgroundColor: "#fff", padding: 30, borderRadius: 18, alignItems: "center" },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#333", marginTop: 8 },
  emptyText: { color: "#777", textAlign: "center", marginTop: 6 },
  mapBottomCard: { position: "absolute", left: 14, right: 14, bottom: 14, backgroundColor: "#fff", padding: 14, borderRadius: 14, elevation: 4 },
});
