import { firestore } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDoc, arrayRemove } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { indicatorId, name } = await request.json();
    
    if (!indicatorId || !name?.trim()) {
      return NextResponse.json({ error: "ID del indicador y nombre son requeridos" }, { status: 400 });
    }
    
    // Crear el método de verificación como subdocumento o referencia
    // En este caso lo almacenamos en un array del indicador
    // Use 'indicator' (singular) collection name
    const indicatorRef = doc(firestore, "indicator", indicatorId);
    const indicatorDoc = await getDoc(indicatorRef);
    
    if (!indicatorDoc.exists()) {
      return NextResponse.json({ error: "Indicador no encontrado" }, { status: 404 });
    }
    
    const methodId = `method_${Date.now()}`;
    const currentMethods = indicatorDoc.data().verificationMethods || [];
    
    await updateDoc(indicatorRef, {
      verificationMethods: [...currentMethods, { id: methodId, name: name.trim() }]
    });
    
    return NextResponse.json({ id: methodId, indicatorId, name });
  } catch (error) {
    console.error("Error creating verification method:", error);
    return NextResponse.json({ error: "Error al crear el método de verificación" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { indicatorId, methodId } = await request.json();
    
    if (!indicatorId || !methodId) {
      return NextResponse.json({ error: "ID del indicador e ID del método son requeridos" }, { status: 400 });
    }
    
    const indicatorRef = doc(firestore, "indicator", indicatorId);
    const indicatorDoc = await getDoc(indicatorRef);
    
    if (!indicatorDoc.exists()) {
      return NextResponse.json({ error: "Indicador no encontrado" }, { status: 404 });
    }
    
    const currentMethods = indicatorDoc.data().verificationMethods || [];
    const updatedMethods = currentMethods.filter((m: any) => m.id !== methodId);
    
    await updateDoc(indicatorRef, {
      verificationMethods: updatedMethods
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting verification method:", error);
    return NextResponse.json({ error: "Error al eliminar el método de verificación" }, { status: 500 });
  }
}
