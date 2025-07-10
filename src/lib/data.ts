import type { User, Indicator, Perspective, VerificationMethod, AssignedIndicator, AssignedVerificationMethod, VerificationStatus } from '@/lib/types';
import { Library, Target, FileCheck, Users, DollarSign, BarChart2, Briefcase, Lightbulb } from 'lucide-react';
import { getCollectionWhereCondition, getCollectionById, getCollection, insertDocument, updateDocument, getCollectionWhereMultipleConditions } from '@/lib/firebase-functions';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export const users: User[] = [
  { id: 'user-1', name: 'Alicia Admin', email: 'alice@example.com', role: 'admin', avatar: 'https://placehold.co/100x100' },
  { id: 'user-2', name: 'Roberto Usuario', email: 'bob@example.com', role: 'user', avatar: 'https://placehold.co/100x100' },
  { id: 'user-3', name: 'Carlos Ejemplo', email: 'charlie@example.com', role: 'user', avatar: 'https://placehold.co/100x100' },
];

export const indicators: Indicator[] = [
  { id: 'ind-1', name: 'Incrementar Satisfacción del Cliente', moreInformationLink:"https://cdn.www.gob.pe/uploads/document/file/2151022/Modelo.pdf?v=1630646546",verificationMethods:[] },
  { id: 'ind-2', name: 'Reducir Costos Operativos', moreInformationLink:"https://cdn.www.gob.pe/uploads/document/file/2151022/Modelo.pdf?v=1630646546",verificationMethods:[] },
  { id: 'ind-3', name: 'Mejorar Programa de Capacitación de Empleados', moreInformationLink:"https://cdn.www.gob.pe/uploads/document/file/2151022/Modelo.pdf?v=1630646546",verificationMethods:[] },
  { id: 'ind-4', name: 'Expandir Cuota de Mercado', moreInformationLink:"https://cdn.www.gob.pe/uploads/document/file/2151022/Modelo.pdf?v=1630646546",verificationMethods:[] },
];

export const perspectives: Perspective[] = [
  { id: 'persp-1', name: 'Financiera', icon: DollarSign },
  { id: 'persp-2', name: 'Cliente', icon: Users },
  { id: 'persp-3', name: 'Procesos Internos', icon: Briefcase },
  { id: 'persp-4', name: 'Aprendizaje y Crecimiento', icon: Lightbulb },
];

const today = new Date();
const getDueDate = (days: number): Date => {
  const date = new Date(today);
  date.setDate(today.getDate() + days);
  return date;
};


export const assignedIndicators: AssignedIndicator[] = [
  {
    id: 'assigned-ind-1',
    userId: 'user-2', // Bob
    indicatorId: 'ind-1', // Increase Customer Satisfaction
    perspectiveId: 'persp-2', // Customer
    assignedDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    assignedVerificationMethods: [
      {
        status: 'Submitted' as VerificationStatus,
        submittedFile: { name: 'analisis_encuesta_q1.pdf', url: '#', uploadedAt: new Date(new Date().setDate(new Date().getDate() - 5)) },
        dueDate: getDueDate(0),
        notes: 'Análisis completo, pendiente de aprobación.',
        name:'vm2'
      },
      {
        status: 'Approved' as VerificationStatus,
        submittedFile: { name: 'informe_satisfaccion_mensual_ene.docx', url: '#', uploadedAt: new Date(new Date().setDate(new Date().getDate() - 20)) },
        dueDate: getDueDate(-15),
        name: 'vm-1'
      }
    ],
    jury:[],
    overallStatus: 'Submitted' as VerificationStatus,
  },
  {
    id: 'assigned-ind-2',
    userId: 'user-2', // Bob
    indicatorId: 'ind-2', // Reduce Operational Costs
    perspectiveId: 'persp-1', // Financial
    assignedDate: new Date(new Date().setDate(new Date().getDate() - 60)),
    jury:[],
    assignedVerificationMethods: [
      {
        status: 'Pending' as VerificationStatus,
        dueDate: getDueDate(10),
        notes: 'Recopilación de datos en curso.',
        name: 'vm-1'
      },
      {
        status: 'Overdue' as VerificationStatus,
        dueDate: getDueDate(-5),
        name: 'vm-1'
      }
    ],
    overallStatus: 'Pending' as VerificationStatus,
  },
  {
    id: 'assigned-ind-3',
    userId: 'user-3', // Charlie
    indicatorId: 'ind-3', // Enhance Employee Training Program
    perspectiveId: 'persp-4', // Learning & Growth
    assignedDate: new Date(new Date().setDate(new Date().getDate() - 10)),
    jury:[],
    assignedVerificationMethods: [
      {
        status: 'Approved' as VerificationStatus,
        submittedFile: { name: 'carlos_capacitacion_avanzada.pdf', url: '#', uploadedAt: new Date(new Date().setDate(new Date().getDate() - 2)) },
        dueDate: getDueDate(15),
        name: 'vm-5'
      }
    ],
    overallStatus: 'Approved' as VerificationStatus,
  },
  {
    id: 'assigned-ind-4',
    userId: 'user-1', // Alice (Admin)
    indicatorId: 'ind-4', // Expand Market Share
    perspectiveId: 'persp-1', // Financial
    jury:[],
    assignedDate: new Date(),
    assignedVerificationMethods: [
        {
            status: 'Pending' as VerificationStatus,
            dueDate: getDueDate(90),
            name: 'vm-4'
        }
    ],
    overallStatus: 'Pending' as VerificationStatus
  }
];

// Helper function to get details by ID
export const getUserById = async (id: string): Promise<User | undefined> => {
  try {
    const user = await getCollectionById<User>('user', id);
    return user ? {
      ...user,
      avatar: user.avatar || 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-download-in-svg-png-gif-file-formats--user-boy-avatars-flat-icons-pack-people-456322.png',
      role: user.role || 'user'
    } : undefined;
  } catch (error) {
    console.error('Error fetching user:', error);
    return undefined;
  }
};

export const getIndicatorById = async (id: string): Promise<Indicator | undefined> => {
  console.log(id)
  try {
    const indicator = await getCollectionById('indicator', id);
    return indicator as Indicator;
  } catch (error) {
    console.error('Error fetching indicator:', error);
    return undefined;
  }
};
//export const getPerspectiveById = (id: string) => perspectives.find(p => p.id === id);
export const getPerspectiveById = async (id: string): Promise<Perspective | undefined> => {
  console.log(id)
  try {
    const perspective = await getCollectionById('perspective', id);
    return perspective as Perspective;
  } catch (error) {
    console.error('Error fetching perspective:', error);
    return undefined;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  const users = await getCollection<User>('user');
  return users.map(user => ({
    ...user,
    avatar: user.avatar || 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-download-in-svg-png-gif-file-formats--user-boy-avatars-flat-icons-pack-people-456322.png',
    role: user.role || 'user'
  }));
};

export const getAllUsersExceptCurrent = async (currentUserId: string): Promise<User[]> => {
  const users = await getCollection<User>('user');
  return users
    .filter(user => user.id !== currentUserId) // Excluir al usuario actual
    .map(user => ({
      ...user,
      avatar: user.avatar || 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-download-in-svg-png-gif-file-formats--user-boy-avatars-flat-icons-pack-people-456322.png',
      role: user.role || 'user'
    }));
};

export const getAllIndicators = async (): Promise<Indicator[]> => {
  const indicators = await getCollection<Indicator>('indicator');
  return indicators.map(indicator => ({
    ...indicator,
    moreInformationLink: indicator.moreInformationLink || "https://cdn.www.gob.pe/uploads/document/file/2151022/Modelo.pdf?v=1630646546"
  }));
};

export const getAllPerspectives = async (): Promise<Perspective[]> => {
  const perspectives = await getCollection<Perspective>('perspective');
  return perspectives.map(perspective => ({
    ...perspective,
    icon: perspective.icon || Briefcase
  }));
};

export const insertAssignedIndicator = async (assignedIndicator: Omit<AssignedIndicator, 'id'>): Promise<string> => {
  try {
    const docId = await insertDocument<AssignedIndicator>('assigned_indicator', assignedIndicator);
    return docId;
  } catch (error) {
    console.error('Error inserting assigned indicator:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  try {
    await updateDocument<User>('user', userId, updates);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const createUser = async (user: Omit<User, 'id'>, password: string): Promise<string> => {
  try {
    // Primero crear el usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, user.email, password);
    const firebaseUser = userCredential.user;
    
    // Luego crear el documento en Firestore con el mismo UID
    const userData = {
      ...user,
      isFirstLogin: true, // Marcar como primer inicio de sesión
      //id: firebaseUser.uid  Usar el UID de Firebase Auth como ID del documento
    };
    
    // Insertar en Firestore usando el UID como ID del documento
    await insertDocument<User>('user', userData);
    
    return firebaseUser.uid;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Nueva función para marcar que el usuario ya no es nuevo
export const markUserAsExperienced = async (userId: string): Promise<void> => {
  try {
    await updateDocument<User>('user', userId, { isFirstLogin: false });
  } catch (error) {
    console.error('Error marking user as experienced:', error);
    throw error;
  }
};

export const getAllAssignedIndicators = async (): Promise<AssignedIndicator[]> => {
  return await getCollection<AssignedIndicator>('assigned_indicator');
};

export const updateAssignedIndicator = async (assignedIndicatorId: string, updates: Partial<AssignedIndicator>): Promise<void> => {
  try {
    await updateDocument<AssignedIndicator>('assigned_indicator', assignedIndicatorId, updates);
  } catch (error) {
    console.error('Error updating assigned indicator:', error);
    throw error;
  }
};

export const checkExistingAssignment = async (userId: string, indicatorId: string): Promise<boolean> => {
  try {
    const conditions = [
      { field: 'userId', operator: '==' as const, value: userId },
      { field: 'indicatorId', operator: '==' as const, value: indicatorId }
    ];
    
    const existingAssignments = await getCollectionWhereMultipleConditions<AssignedIndicator>('assigned_indicator', conditions);
    return existingAssignments.length > 0;
  } catch (error) {
    console.error('Error checking existing assignment:', error);
    return false;
  }
};
