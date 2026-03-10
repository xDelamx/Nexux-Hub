import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Notebook } from '../types';

export function useNotebooks() {
    const { user } = useAuth();
    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setNotebooks([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'users', user.uid, 'notebooks'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const res: Notebook[] = [];
            snapshot.forEach((doc) => {
                res.push(doc.data() as Notebook);
            });
            // Sort by title or id? Let's just keep default order using array methods if needed
            res.sort((a, b) => parseInt(a.id.substring(1)) - parseInt(b.id.substring(1)));
            setNotebooks(res);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    // Saving the WHOLE notebook is the easiest migration path, 
    // although not the most efficient for large datasets. 
    // Given the structure is nested (Notebook -> Sections -> Pages), 
    // saving the notebook document is atomic.
    const saveNotebook = async (notebook: Notebook) => {
        if (!user) return;
        await setDoc(doc(db, 'users', user.uid, 'notebooks', notebook.id), notebook);
    };

    const deleteNotebook = async (notebookId: string) => {
        if (!user) return;
        await deleteDoc(doc(db, 'users', user.uid, 'notebooks', notebookId));
    };

    return { notebooks, loading, saveNotebook, deleteNotebook };
}
