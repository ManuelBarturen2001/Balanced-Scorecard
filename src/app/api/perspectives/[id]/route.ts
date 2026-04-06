import { firestore } from "@/lib/firebase";
import { collection, deleteDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const perspectiveId = params.id;
    
    // Verificar si la perspectiva tiene indicadores
    const indicatorsCol = collection(firestore, "indicator");
    const indicatorsQuery = query(indicatorsCol, where("perspectiveId", "==", perspectiveId));
    const indicatorsSnapshot = await getDocs(indicatorsQuery);
    
    if (!indicatorsSnapshot.empty) {
      return NextResponse.json(
        { error: "No se puede eliminar una perspectiva que tiene indicadores. Elimina los indicadores primero." },
        { status: 400 }
      );
    }
    
    // Eliminar la perspectiva
    const perspectiveRef = doc(firestore, "perspective", perspectiveId);
    await deleteDoc(perspectiveRef);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting perspective:", error);
    return NextResponse.json({ error: "Error al eliminar la perspectiva" }, { status: 500 });
  }
}
