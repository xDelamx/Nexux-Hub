import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Resource } from '../types';

export function useResources() {
    const { user } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setResources([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'users', user.uid, 'resources'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const res: Resource[] = [];
            snapshot.forEach((doc) => {
                res.push(doc.data() as Resource);
            });
            // Client-side sort to avoid Firestore index requirements initially
            res.sort((a, b) => (a.order || 0) - (b.order || 0));
            setResources(res);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching resources:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    const addResource = async (resource: Resource) => {
        if (!user) return;
        // Assign order = current length (append)
        const newRes = { ...resource, order: resources.length };
        await setDoc(doc(db, 'users', user.uid, 'resources', resource.id), newRes);
    };

    const removeResource = async (id: string) => {
        if (!user) return;
        await deleteDoc(doc(db, 'users', user.uid, 'resources', id));
    };

    const updateResources = async (newResources: Resource[]) => {
        if (!user) return;

        // Optimistic update
        setResources(newResources);

        // Batch update orders
        const batch = writeBatch(db);
        newResources.forEach((res, index) => {
            if (res.order !== index) {
                const ref = doc(db, 'users', user.uid, 'resources', res.id);
                batch.update(ref, { order: index });
            }
        });

        try {
            await batch.commit();
        } catch (e) {
            console.error("Error updating resource order:", e);
            // Revert or re-fetch handled by onSnapshot usually
        }
    };

    return { resources, loading, addResource, removeResource, updateResources };
}
