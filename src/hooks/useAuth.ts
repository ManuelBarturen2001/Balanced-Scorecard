"use client";

import type { User } from '@/lib/types';
import { auth, firestore } from '../lib/firebase';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { markUserAsExperienced } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updatedData: Partial<Omit<User, 'id' | 'role'>>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  markAsExperienced: () => Promise<void>;
  isAdmin: boolean;
  isAsignador: boolean;
  isCalificador: boolean;
  isResponsable: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'activeUser';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log(firebaseUser)
      const usersRef = collection(firestore, 'user');
      const q = query(usersRef, where('email', '==', firebaseUser.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Usuario no encontrado en la base de datos');
      }

      console.log(querySnapshot.docs[0].id)
      const userData = {id:querySnapshot.docs[0].id,...querySnapshot.docs[0].data()} as User;
      
      // Compatibilidad con el rol "user" - convertirlo a "responsable"
      if (userData.role === 'responsable') {
        userData.role = 'responsable';
      }
      
      // Asegurar que el usuario tenga los campos por defecto si no existen
      const defaultUserData = {
        ...userData,
        roleType: userData.roleType || 'variante',
        availableRoles: userData.availableRoles || [userData.role],
        notifications: userData.notifications || [],
        stats: userData.stats || {},
      };
      
      setUser(defaultUserData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUserData));
      
      return true;
    } catch (error: any) {
      console.error('Error during login:', error);
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password') {
        throw new Error('Credenciales inválidas');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  const isAdmin = user?.role === 'admin';
  const isAsignador = user?.role === 'asignador';
  const isCalificador = user?.role === 'calificador';
  const isResponsable = user?.role === 'responsable';

  const updateUserProfile = useCallback(async (updatedData: Partial<Omit<User, 'id' | 'role'> | { role: string }>) => {
    if (!user) throw new Error("Usuario no autenticado");
    
    // Importar la función updateUser de data.ts
    const { updateUser } = await import('@/lib/data');
    
    // Actualizar en Firebase
    await updateUser(user.id, updatedData as Partial<User>);
    
    // Actualizar estado local
    const updatedUser = { ...user, ...updatedData };
    console.log('Updating user state:', updatedUser);
    setUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
  }, [user]);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) throw new Error("Usuario no autenticado");
    await updatePassword(auth.currentUser, newPassword);
  }, []);

  const markAsExperienced = useCallback(async () => {
    if (!user) throw new Error("Usuario no autenticado");
    await markUserAsExperienced(user.id);
    const updatedUser = { ...user, isFirstLogin: false };
    setUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
  }, [user]);

  return React.createElement(
    AuthContext.Provider,
    { 
      value: { 
        user, 
        login, 
        logout, 
        isAdmin, 
        isAsignador,
        isCalificador,
        isResponsable,
        loading, 
        updateUserProfile, 
        changePassword, 
        markAsExperienced 
      } 
    },
    children
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};