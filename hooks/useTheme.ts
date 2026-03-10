import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ThemeConfig } from '../types';

// Default theme
const DEFAULT_THEME: ThemeConfig = {
    id: 'midnight',
    name: 'Midnight Blue',
    mode: 'dark',
    backgroundType: 'solid',
    backgroundValue: '#001122',
    accentColor: '#3b82f6',
    glassOpacity: 0.8
};

export function useTheme() {
    const { user } = useAuth();
    const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(DEFAULT_THEME);
    const [loading, setLoading] = useState(true);

    // Load theme from Firestore when user logs in
    useEffect(() => {
        if (!user) {
            setCurrentTheme(DEFAULT_THEME);
            setLoading(false);
            return;
        }

        // Reset to loading state and default theme when user changes
        setLoading(true);
        setCurrentTheme(DEFAULT_THEME);

        const loadTheme = async () => {
            try {
                const themeDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'theme'));
                if (themeDoc.exists()) {
                    setCurrentTheme(themeDoc.data() as ThemeConfig);
                } else {
                    // If no theme saved, use default
                    setCurrentTheme(DEFAULT_THEME);
                }
            } catch (error) {
                console.error('Error loading theme:', error);
                setCurrentTheme(DEFAULT_THEME);
            } finally {
                setLoading(false);
            }
        };

        loadTheme();
    }, [user]);

    // Save theme to Firestore
    const updateTheme = async (updates: Partial<ThemeConfig>) => {
        if (!user) return;

        const newTheme = { ...currentTheme, ...updates };
        setCurrentTheme(newTheme);

        try {
            await setDoc(doc(db, 'users', user.uid, 'preferences', 'theme'), newTheme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    return { currentTheme, updateTheme, loading };
}
