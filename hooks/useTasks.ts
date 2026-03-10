import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';

export function useTasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'users', user.uid, 'tasks'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const res: Task[] = [];
            snapshot.forEach((doc) => {
                res.push(doc.data() as Task);
            });
            // Sort by creation time desc
            res.sort((a, b) => b.createdAt - a.createdAt);
            setTasks(res);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    const addTask = async (task: Task) => {
        if (!user) return;
        await setDoc(doc(db, 'users', user.uid, 'tasks', task.id), task);
    };

    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        if (!user) return;
        await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), updates);
    };

    const removeTask = async (taskId: string) => {
        if (!user) return;
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
    };

    return { tasks, loading, addTask, updateTask, removeTask };
}
