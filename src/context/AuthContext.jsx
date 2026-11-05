import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registro de usuario en Firebase Authentication y creación de documento en Firestore
  async function signup(email, password, name, phone) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guarda el perfil inicial del usuario en la colección 'users'
    await setDoc(doc(db, "users", user.uid), {
      name: name || "",
      email: email || "",
      phone: phone || "",
      hasVerifiedLocation: false,
      location: null,
      storePhotoUrl: "",
      createdAt: new Date().toISOString(),
    });

    return user;
  }

  // Inicio de sesión
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Cierre de sesión
  function logout() {
    return signOut(auth);
  }

  // Observador de estado de autenticación y carga de perfil en tiempo real
  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data());
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error("Error al escuchar perfil del usuario:", err);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    register: signup, // Alias para compatibilidad
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}