'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAdminAccess } from '@/hooks/use-admin-access';

interface DevModeContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  resetEdits: () => void;
  pendingUrl: string | null;
  setPendingUrl: (url: string | null) => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdminAccess();
  const [requestedEditMode, setRequestedEditMode] = useState(false);
  const isEditMode = requestedEditMode && isAdmin;
  const setIsEditMode = (enabled: boolean) => setRequestedEditMode(enabled && isAdmin);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Handle browser tab/window closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Triggers the native browser confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const resetEdits = () => {
    setHasUnsavedChanges(false);
    setRequestedEditMode(false);
    setPendingUrl(null);
  };

  return (
    <DevModeContext.Provider value={{ 
      isEditMode, 
      setIsEditMode, 
      hasUnsavedChanges, 
      setHasUnsavedChanges,
      resetEdits,
      pendingUrl,
      setPendingUrl
    }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}
