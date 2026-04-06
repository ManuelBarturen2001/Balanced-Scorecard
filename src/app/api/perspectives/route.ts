import { firestore } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Use 'perspective' (singular) collection name to match existing data structure
    const perspectivesCol = collection(firestore, "perspective");
    const snapshot = await getDocs(perspectivesCol);
    
    console.log(`Found ${snapshot.size} perspectives`);
    
    const perspectives = await Promise.all(
      snapshot.docs.map(async (perspectiveDoc) => {
        const perspectiveData = perspectiveDoc.data();
        console.log(`Processing perspective: ${perspectiveDoc.id} - ${perspectiveData.name}`);
        
        // Obtener indicadores
        const indicatorsCol = collection(firestore, "indicator");
        const indicatorsQuery = query(indicatorsCol, where("perspectiveId", "==", perspectiveDoc.id));
        const indicatorsSnapshot = await getDocs(indicatorsQuery);
        
        console.log(`  Found ${indicatorsSnapshot.size} indicators for perspective ${perspectiveDoc.id}`);
        
        const indicators = await Promise.all(
          indicatorsSnapshot.docs.map(async (indicatorDoc) => {
            const indicatorData = indicatorDoc.data();
            
            // Los métodos de verificación están en el array del indicador
            return {
              id: indicatorDoc.id,
              name: indicatorData.name,
              verificationMethods: indicatorData.verificationMethods || []
            };
          })
        );
        
        return {
          id: perspectiveDoc.id,
          name: perspectiveData.name,
          indicators
        };
      })
    );
    
    console.log(`Returning ${perspectives.length} perspectives`);
    return NextResponse.json(perspectives);
  } catch (error) {
    console.error("Error fetching perspectives:", error);
    return NextResponse.json({ error: "Error fetching perspectives", details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    
    // Use 'perspective' (singular) collection name
    const perspectivesCol = collection(firestore, "perspective");
    const docRef = await addDoc(perspectivesCol, {
      name: name.trim(),
      createdAt: new Date().toISOString(),
      active: true
    });
    
    return NextResponse.json({ id: docRef.id, name });
  } catch (error) {
    console.error("Error creating perspective:", error);
    return NextResponse.json({ error: "Error al crear la perspectiva" }, { status: 500 });
  }
}
