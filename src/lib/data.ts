import type { User, Indicator, Perspective, VerificationMethod, AssignedIndicator, AssignedVerificationMethod, VerificationStatus, Faculty, ProfessionalSchool, MockFile, Office } from '@/lib/types';
import { Library, Target, FileCheck, Users, DollarSign, BarChart2, Briefcase, Lightbulb } from 'lucide-react';
import { getCollectionWhereCondition, getCollectionById, getCollection, insertDocument, updateDocument, getCollectionWhereMultipleConditions } from '@/lib/firebase-functions';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

// Datos de Facultades de la UNMSM
export const faculties: Faculty[] = [
  { id: 'fac-1', name: 'Facultad de Medicina', shortName: 'Medicina' },
  { id: 'fac-2', name: 'Facultad de Derecho y Ciencia Política', shortName: 'Derecho' },
  { id: 'fac-3', name: 'Facultad de Letras y Ciencias Humanas', shortName: 'Letras' },
  { id: 'fac-4', name: 'Facultad de Farmacia y Bioquímica', shortName: 'Farmacia' },
  { id: 'fac-5', name: 'Facultad de Odontología', shortName: 'Odontología' },
  { id: 'fac-6', name: 'Facultad de Educación', shortName: 'Educación' },
  { id: 'fac-7', name: 'Facultad de Química e Ingeniería Química', shortName: 'Química' },
  { id: 'fac-8', name: 'Facultad de Medicina Veterinaria', shortName: 'Veterinaria' },
  { id: 'fac-9', name: 'Facultad de Ciencias Administrativas', shortName: 'Administración' },
  { id: 'fac-10', name: 'Facultad de Ciencias Biológicas', shortName: 'Biología' },
  { id: 'fac-11', name: 'Facultad de Ciencias Contables', shortName: 'Contabilidad' },
  { id: 'fac-12', name: 'Facultad de Ciencias Económicas', shortName: 'Economía' },
  { id: 'fac-13', name: 'Facultad de Ciencias Físicas', shortName: 'Física' },
  { id: 'fac-14', name: 'Facultad de Ciencias Matemáticas', shortName: 'Matemáticas' },
  { id: 'fac-15', name: 'Facultad de Ciencias Sociales', shortName: 'Sociales' },
  { id: 'fac-16', name: 'Facultad de Ingeniería Geológica, Minera, Metalúrgica y Geográfica', shortName: 'Geología' },
  { id: 'fac-17', name: 'Facultad de Ingeniería Industrial', shortName: 'Industrial' },
  { id: 'fac-18', name: 'Facultad de Ingeniería de Sistemas e Informática', shortName: 'Sistemas' },
  { id: 'fac-19', name: 'Facultad de Psicología', shortName: 'Psicología' },
  { id: 'fac-20', name: 'Facultad de Ingeniería Electrónica y Eléctrica', shortName: 'Electrónica' },
];

// Datos de Oficinas (ejemplo)
export const offices: Office[] = [
  { id: 'of-rectorado', name: 'Rectorado', shortName: 'Rectorado' },
  { id: 'of-vri', name: 'Vicerrectorado de Investigación', shortName: 'VRI' },
  { id: 'of-vra', name: 'Vicerrectorado Académico', shortName: 'VRA' },
  { id: 'of-rrii', name: 'Oficina de Relaciones Internacionales', shortName: 'ORII' },
  { id: 'of-ti', name: 'Oficina de Tecnologías de Información', shortName: 'OTI' },
];

// Datos de Escuelas Profesionales de la UNMSM
export const professionalSchools: ProfessionalSchool[] = [
  // Medicina
  { id: 'ep-1', name: 'Medicina Humana', facultyId: 'fac-1' },
  { id: 'ep-2', name: 'Obstetricia', facultyId: 'fac-1' },
  { id: 'ep-3', name: 'Enfermería', facultyId: 'fac-1' },
  { id: 'ep-4', name: 'Nutrición', facultyId: 'fac-1' },
  { id: 'ep-5', name: 'Tecnología Médica', facultyId: 'fac-1' },
  
  // Derecho
  { id: 'ep-6', name: 'Derecho', facultyId: 'fac-2' },
  { id: 'ep-7', name: 'Ciencia Política', facultyId: 'fac-2' },
  
  // Letras y Ciencias Humanas
  { id: 'ep-8', name: 'Literatura', facultyId: 'fac-3' },
  { id: 'ep-9', name: 'Filosofía', facultyId: 'fac-3' },
  { id: 'ep-10', name: 'Historia', facultyId: 'fac-3' },
  { id: 'ep-11', name: 'Lingüística', facultyId: 'fac-3' },
  { id: 'ep-12', name: 'Comunicación Social', facultyId: 'fac-3' },
  { id: 'ep-13', name: 'Bibliotecología y Ciencias de la Información', facultyId: 'fac-3' },
  { id: 'ep-14', name: 'Arte', facultyId: 'fac-3' },
  { id: 'ep-15', name: 'Danza', facultyId: 'fac-3' },
  { id: 'ep-16', name: 'Conservación y Restauración', facultyId: 'fac-3' },
  
  // Farmacia
  { id: 'ep-17', name: 'Farmacia y Bioquímica', facultyId: 'fac-4' },
  { id: 'ep-18', name: 'Ciencia de los Alimentos', facultyId: 'fac-4' },
  { id: 'ep-19', name: 'Toxicología', facultyId: 'fac-4' },
  
  // Odontología
  { id: 'ep-20', name: 'Odontología', facultyId: 'fac-5' },
  
  // Educación
  { id: 'ep-21', name: 'Educación', facultyId: 'fac-6' },
  { id: 'ep-22', name: 'Educación Física', facultyId: 'fac-6' },
  
  // Química
  { id: 'ep-23', name: 'Química', facultyId: 'fac-7' },
  { id: 'ep-24', name: 'Ingeniería Química', facultyId: 'fac-7' },
  
  // Veterinaria
  { id: 'ep-25', name: 'Medicina Veterinaria', facultyId: 'fac-8' },
  
  // Administración
  { id: 'ep-26', name: 'Administración', facultyId: 'fac-9' },
  { id: 'ep-27', name: 'Administración de Negocios Internacionales', facultyId: 'fac-9' },
  { id: 'ep-28', name: 'Administración de Turismo', facultyId: 'fac-9' },
  
  // Biología
  { id: 'ep-29', name: 'Ciencias Biológicas', facultyId: 'fac-10' },
  { id: 'ep-30', name: 'Genética y Biotecnología', facultyId: 'fac-10' },
  { id: 'ep-31', name: 'Microbiología y Parasitología', facultyId: 'fac-10' },
  
  // Contabilidad
  { id: 'ep-32', name: 'Contabilidad', facultyId: 'fac-11' },
  { id: 'ep-33', name: 'Auditoría Empresarial y del Sector Público', facultyId: 'fac-11' },
  
  // Economía
  { id: 'ep-34', name: 'Economía', facultyId: 'fac-12' },
  { id: 'ep-35', name: 'Economía Pública', facultyId: 'fac-12' },
  { id: 'ep-36', name: 'Economía Internacional', facultyId: 'fac-12' },
  
  // Física
  { id: 'ep-37', name: 'Física', facultyId: 'fac-13' },
  { id: 'ep-38', name: 'Ingeniería Mecánica de Fluidos', facultyId: 'fac-13' },
  
  // Matemáticas
  { id: 'ep-39', name: 'Matemática', facultyId: 'fac-14' },
  { id: 'ep-40', name: 'Estadística', facultyId: 'fac-14' },
  { id: 'ep-41', name: 'Computación Científica', facultyId: 'fac-14' },
  { id: 'ep-42', name: 'Investigación Operativa', facultyId: 'fac-14' },
  
  // Ciencias Sociales
  { id: 'ep-43', name: 'Sociología', facultyId: 'fac-15' },
  { id: 'ep-44', name: 'Antropología', facultyId: 'fac-15' },
  { id: 'ep-45', name: 'Trabajo Social', facultyId: 'fac-15' },
  { id: 'ep-46', name: 'Arqueología', facultyId: 'fac-15' },
  
  // Geología
  { id: 'ep-47', name: 'Ingeniería Geológica', facultyId: 'fac-16' },
  { id: 'ep-48', name: 'Ingeniería de Minas', facultyId: 'fac-16' },
  { id: 'ep-49', name: 'Ingeniería Metalúrgica', facultyId: 'fac-16' },
  { id: 'ep-50', name: 'Ingeniería Geográfica', facultyId: 'fac-16' },
  
  // Industrial
  { id: 'ep-51', name: 'Ingeniería Industrial', facultyId: 'fac-17' },
  { id: 'ep-52', name: 'Ingeniería de Seguridad y Salud en el Trabajo', facultyId: 'fac-17' },
  
  // Sistemas
  { id: 'ep-53', name: 'Ingeniería de Sistemas', facultyId: 'fac-18' },
  { id: 'ep-54', name: 'Ingeniería de Software', facultyId: 'fac-18' },
  
  // Psicología
  { id: 'ep-55', name: 'Psicología', facultyId: 'fac-19' },
  { id: 'ep-56', name: 'Psicología Organizacional y de la Gestión Humana', facultyId: 'fac-19' },
  
  // Electrónica
  { id: 'ep-57', name: 'Ingeniería Electrónica', facultyId: 'fac-20' },
  { id: 'ep-58', name: 'Ingeniería Eléctrica', facultyId: 'fac-20' },
  { id: 'ep-59', name: 'Ingeniería de Telecomunicaciones', facultyId: 'fac-20' },
  { id: 'ep-60', name: 'Ingeniería Biomédica', facultyId: 'fac-20' },
];

export const users: User[] = [
  { id: 'user-1', name: 'Alicia Admin', email: 'alice@example.com', role: 'admin', roleType: 'unico', avatar: 'https://placehold.co/100x100' },
  { id: 'user-2', name: 'Roberto Usuario', email: 'bob@example.com', role: 'usuario', roleType: 'variante', availableRoles: ['usuario', 'calificador'], avatar: 'https://placehold.co/100x100' },
  { id: 'user-3', name: 'Carlos Ejemplo', email: 'charlie@example.com', role: 'usuario', roleType: 'variante', availableRoles: ['usuario', 'calificador'], avatar: 'https://placehold.co/100x100' },
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
      role: ((user.role as any) === 'user' ? 'usuario' : user.role) || 'usuario'
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

// Funciones para obtener facultades y escuelas profesionales
export const getFacultyById = (id: string): Faculty | undefined => {
  return faculties.find(f => f.id === id);
};

export const getProfessionalSchoolById = (id: string): ProfessionalSchool | undefined => {
  return professionalSchools.find(ps => ps.id === id);
};

export const getAllFaculties = (): Faculty[] => {
  return faculties;
};

export const getAllProfessionalSchools = (): ProfessionalSchool[] => {
  return professionalSchools;
};

export const getProfessionalSchoolsByFaculty = (facultyId: string): ProfessionalSchool[] => {
  return professionalSchools.filter(ps => ps.facultyId === facultyId);
};

export const getAllOffices = (): Office[] => {
  return offices;
};

export const getOfficeById = (id: string): Office | undefined => {
  return offices.find(o => o.id === id);
};

export const getAllUsers = async (): Promise<User[]> => {
  const users = await getCollection<User>('user');
  return users.map(user => ({
    ...user,
    avatar: user.avatar || 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-download-in-svg-png-gif-file-formats--user-boy-avatars-flat-icons-pack-people-456322.png',
    role: ((user.role as any) === 'user' ? 'usuario' : user.role) || 'usuario'
  }));
};

export const getAllUsersExceptCurrent = async (currentUserId: string): Promise<User[]> => {
  const users = await getCollection<User>('user');
  return users
    .filter(user => user.id !== currentUserId) // Excluir al usuario actual
    .map(user => ({
      ...user,
      avatar: user.avatar || 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-icon-download-in-svg-png-gif-file-formats--user-boy-avatars-flat-icons-pack-people-456322.png',
      role: ((user.role as any) === 'user' ? 'usuario' : user.role) || 'usuario'
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

export const uploadFile = async (
  file: File,
  assignedIndicatorId: string,
  verificationMethodName: string,
  userId: string
): Promise<{ success: boolean; file?: MockFile; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignedIndicatorId', assignedIndicatorId);
    formData.append('verificationMethodName', verificationMethodName);
    formData.append('userId', userId);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error };
    }

    return { success: true, file: result.file };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: 'Error de conexión' };
  }
};

export const migrateUserRoles = async (): Promise<void> => {
  try {
    const allUsers = await getCollection<User>('user');
    const usersToMigrate = allUsers.filter(user => (user.role as any) === 'user');
    
    for (const user of usersToMigrate) {
      await updateUser(user.id, { 
        role: 'usuario',
        roleType: 'variante',
        availableRoles: ['usuario', 'calificador']
      });
      console.log(`Migrated user ${user.name} from 'user' to 'usuario'`);
    }
    
    console.log(`Migration completed. ${usersToMigrate.length} users migrated.`);
  } catch (error) {
    console.error('Error migrating user roles:', error);
    throw error;
  }
};