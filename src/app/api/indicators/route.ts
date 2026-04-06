import { firestore } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { perspectiveId, name } = await request.json();
    
    if (!perspectiveId || !name?.trim()) {
      return NextResponse.json({ error: "ID de perspectiva y nombre son requeridos" }, { status: 400 });
    }
    
    // Use 'indicator' (singular) collection name
    const indicatorsCol = collection(firestore, "indicator");
    const docRef = await addDoc(indicatorsCol, {
      perspectiveId,
      name: name.trim(),
      verificationMethods: [],
      createdAt: new Date().toISOString(),
      active: true
    });
    
    return NextResponse.json({ id: docRef.id, perspectiveId, name, verificationMethods: [] });
  } catch (error) {
    console.error("Error creating indicator:", error);
    return NextResponse.json({ error: "Error al crear el indicador" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const indicatorId = body.indicatorId;
    
    if (!indicatorId) {
      return NextResponse.json({ error: "El ID del indicador es requerido" }, { status: 400 });
    }
    
    // Verificar si el indicador está asignado en assignments
    const assignmentsCol = collection(firestore, "assigned_indicator");
    const assignmentsQuery = query(assignmentsCol, where("indicatorId", "==", indicatorId));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    
    if (!assignmentsSnapshot.empty) {
      return NextResponse.json(
        { error: "No se puede eliminar un indicador que tiene asignaciones activas. Desactiva las asignaciones primero." },
        { status: 400 }
      );
    }
    
    // Eliminar el indicador
    const indicatorRef = doc(firestore, "indicator", indicatorId);
    await deleteDoc(indicatorRef);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting indicator:", error);
    return NextResponse.json({ error: "Error al eliminar el indicador" }, { status: 500 });
  }
}
