import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { apiFetch } from "./api";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("farmer");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  const clearForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSkills("");
    setExperience("");
  };

  const login = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("Missing Details", "Enter phone number and password.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone: phone.trim(),
          password,
          role,
        }),
      });

      onLogin(data.user, data.token);
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing Details", "Fill all required fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password", "Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password", "Passwords do not match.");
      return;
    }

    const skillArray = skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      setLoading(true);
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          skills: role === "worker" ? skillArray : [],
          experience: role === "worker" ? Number(experience || 0) : 0,
        }),
      });

      Alert.alert("Success 🌱", "Account created successfully.", [
        {
          text: "Login",
          onPress: () => {
            clearForm();
            setMode("login");
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>KrishiOnGo</Text>
          <Text style={styles.subtitle}>Agricultural jobs & skill matching</Text>

          <View style={styles.switchRow}>
            <TouchableOpacity
              style={[styles.switchButton, mode === "login" && styles.activeSwitch]}
              onPress={() => setMode("login")}
              disabled={loading}
            >
              <Text style={[styles.switchText, mode === "login" && styles.activeSwitchText]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchButton, mode === "register" && styles.activeSwitch]}
              onPress={() => setMode("register")}
              disabled={loading}
            >
              <Text style={[styles.switchText, mode === "register" && styles.activeSwitchText]}>Register</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>{mode === "login" ? "Welcome Back" : "Create Account"}</Text>

            <Text style={styles.label}>{mode === "login" ? "Login as" : "Register as"}</Text>
            <View style={styles.roleRow}>
              {[
                ["farmer", "👨‍🌾", "Farmer"],
                ["worker", "👷", "Worker"],
              ].map(([value, icon, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.roleButton, role === value && styles.activeRole]}
                  onPress={() => setRole(value)}
                  disabled={loading}
                >
                  <Text style={styles.roleIcon}>{icon}</Text>
                  <Text style={[styles.roleText, role === value && styles.activeRoleText]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === "register" && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </>
            )}

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              maxLength={15}
            />

            {mode === "register" && role === "worker" && (
              <>
                <Text style={styles.label}>Skills</Text>
                <TextInput
                  style={styles.input}
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="coconut harvesting, farm cleaning"
                />

                <Text style={styles.label}>Experience (years)</Text>
                <TextInput
                  style={styles.input}
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="Example: 3"
                  keyboardType="numeric"
                />
              </>
            )}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
            />

            {mode === "register" && (
              <>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  secureTextEntry
                />
              </>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={mode === "login" ? login : register}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {mode === "login" ? `Login as ${role}` : `Register as ${role}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F8F2" },
  scroll: { flexGrow: 1, justifyContent: "center" },
  container: { padding: 24 },
  logo: { fontSize: 58, textAlign: "center" },
  title: { fontSize: 34, fontWeight: "800", color: "#1B5E20", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#666", marginTop: 6, marginBottom: 18 },
  switchRow: { flexDirection: "row", backgroundColor: "#E8F5E9", padding: 4, borderRadius: 13, marginBottom: 16 },
  switchButton: { flex: 1, padding: 11, alignItems: "center", borderRadius: 10 },
  activeSwitch: { backgroundColor: "#2E7D32" },
  switchText: { color: "#2E7D32", fontWeight: "700" },
  activeSwitchText: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 5 },
  heading: { fontSize: 24, fontWeight: "800", textAlign: "center", color: "#222", marginBottom: 16 },
  label: { fontWeight: "700", color: "#444", marginBottom: 7, marginTop: 8 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  roleButton: { flex: 1, minHeight: 70, borderWidth: 1.5, borderColor: "#D8D8D8", borderRadius: 13, justifyContent: "center", alignItems: "center" },
  activeRole: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  roleIcon: { fontSize: 22 },
  roleText: { marginTop: 3, fontWeight: "700", color: "#444" },
  activeRoleText: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#D8D8D8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, backgroundColor: "#FAFAFA", marginBottom: 3 },
  primaryButton: { backgroundColor: "#2E7D32", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 14 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
