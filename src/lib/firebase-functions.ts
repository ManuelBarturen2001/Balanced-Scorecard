import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { User } from './types';

export const getCollection = async <T>(path: string): Promise<T[]> => {
  try {
    const collectionRef = collection(firestore, path);
    const querySnapshot = await getDocs(collectionRef);
    const items: T[] = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      } as T);
    });
    
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${path}:`, error);
    return [];
  }
};

export const getCollectionWhereCondition = async <T>(path: string, field: string, condition: any): Promise<T[]> => {
  console.log(path,field,condition)
    try {
    const collectionRef = collection(firestore, path);
    const q = query(collectionRef, where(field, '==', condition));
    const querySnapshot = await getDocs(q);
    const items: T[] = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      } as T);
    });
    
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${path} with condition:`, error);
    return [];
  }
};

export const getCollectionWhereMultipleConditions = async <T>(
  path: string, 
  conditions: Array<{ field: string; operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in'; value: any }>
): Promise<T[]> => {
  try {
    const collectionRef = collection(firestore, path);
    const whereClauses = conditions.map(condition => 
      where(condition.field, condition.operator, condition.value)
    );
    const q = query(collectionRef, ...whereClauses);
    const querySnapshot = await getDocs(q);
    const items: T[] = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      } as T);
    });
    
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${path} with multiple conditions:`, error);
    return [];
  }
};

export const getCollectionWhereArrayContains = async <T>(path: string, field: string, value: any): Promise<T[]> => {
  try {
    const collectionRef = collection(firestore, path);
    const q = query(collectionRef, where(field, 'array-contains', value));
    const querySnapshot = await getDocs(q);
    const items: T[] = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      } as T);
    });
    
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${path} with array-contains:`, error);
    return [];
  }
};

export const getCollectionById = async <T>(path: string, id: string): Promise<T | undefined> => {
  try {
    const docRef = doc(firestore, path, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as T;
  } catch (error) {
    console.error(`Error fetching document ${id} from ${path}:`, error);
    return undefined;
  }
};

export const insertDocument = async <T>(path: string, data: Omit<T, 'id'>): Promise<string> => {
  try {
    const collectionRef = collection(firestore, path);
    const docRef = await addDoc(collectionRef, data);
    return docRef.id;
  } catch (error) {
    console.error(`Error inserting document into ${path}:`, error);
    throw error;
  }
};

export const updateDocument = async <T>(path: string, id: string, data: Partial<T>): Promise<void> => {
  try {
    const docRef = doc(firestore, path, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Error updating document ${id} in ${path}:`, error);
    throw error;
  }
};

export const deleteDocument = async (path: string, id: string): Promise<void> => {
  try {
    const docRef = doc(firestore, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document ${id} from ${path}:`, error);
    throw error;
  }
};

