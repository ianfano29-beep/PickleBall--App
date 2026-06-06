import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
export const ADMIN_EMAIL = "pickle@gmail.com";
export const ADMIN_PASSWORD = "!Admin123!";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (uid) => {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) setUserProfile({ id: snap.id, ...snap.data() });
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const admin = u.email === ADMIN_EMAIL;
                setIsAdmin(admin);
                if (!admin) await fetchProfile(u.uid);
                else setUserProfile({ fullName: "Admin", email: ADMIN_EMAIL });
            } else { setUserProfile(null); setIsAdmin(false); }
            setLoading(false);
        });
        return unsub;
    }, [fetchProfile]);

    const loginAdmin = () => signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const loginCustomer = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const registerCustomer = async ({ email, password, fullName, phone, age }) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: fullName });
        await setDoc(doc(db, "users", cred.user.uid), { fullName, email, phone: phone || "", age: age || "", createdAt: serverTimestamp() });
        await fetchProfile(cred.user.uid);
        return cred.user;
    };

    const updateUserProfile = async (data) => {
        if (!user) return;
        await setDoc(doc(db, "users", user.uid), data, { merge: true });
        await fetchProfile(user.uid);
    };

    const logout = () => signOut(auth);
    const refreshProfile = () => user && !isAdmin && fetchProfile(user.uid);

    return (
        <AuthContext.Provider value={{ user, userProfile, isAdmin, loading, loginAdmin, loginCustomer, registerCustomer, updateUserProfile, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be inside AuthProvider");
    return ctx;
};