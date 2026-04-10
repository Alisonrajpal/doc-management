import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ DOCUMENTS CRUD ============

// Get all documents for current user
export async function getDocuments() {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return [];
    }

    console.log("Fetched documents from Supabase:", data);
    return data || [];
  } catch (err) {
    console.error("Unexpected error in getDocuments:", err);
    return [];
  }
}

// Get documents by status
export async function getDocumentsByStatus(status) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("status", status)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents by status:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error:", err);
    return [];
  }
}

// Get documents pending for a specific step
export async function getDocumentsByStep(step) {
  let status = "";
  if (step === 1) status = "pending_reviewer";
  else if (step === 2) status = "pending_manager";
  else if (step === 3) status = "pending_finance";
  else return [];

  return getDocumentsByStatus(status);
}

// Save a new document
export async function saveDocument(document) {
  try {
    console.log("Saving document to Supabase:", document);

    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          file_name: document.fileName,
          vendor_name: document.vendor_name,
          invoice_number: document.invoice_number,
          date: document.date,
          amount: parseFloat(document.amount),
          vat: parseFloat(document.vat),
          status: document.status || "pending_reviewer",
          document_type: document.document_type,
          uploaded_by: document.uploaded_by,
          file_fingerprint: document.fileFingerprint,
        },
      ])
      .select();

    if (error) {
      console.error("Error saving document:", error);
      return null;
    }

    console.log("Document saved successfully:", data);
    return data?.[0] || null;
  } catch (err) {
    console.error("Unexpected error in saveDocument:", err);
    return null;
  }
}

// Update document status (approve/reject)
export async function updateDocumentStatus(documentId, newStatus) {
  try {
    console.log("=== UPDATE DOCUMENT STATUS ===");
    console.log("Document ID:", documentId);
    console.log("New Status:", newStatus);

    // First check if document exists
    const { data: existingDoc, error: findError } = await supabase
      .from("documents")
      .select("id, status, file_name")
      .eq("id", documentId)
      .single();

    if (findError) {
      console.error("Error finding document:", findError);
      return null;
    }

    console.log("Existing document found:", existingDoc);
    console.log("Current status:", existingDoc?.status);

    // Perform the update WITHOUT .select() first to see if it works
    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: newStatus })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      return null;
    }

    console.log("Update successful, fetching updated document...");

    // Now fetch the updated document
    const { data: updatedDoc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated document:", fetchError);
      // Return a minimal object so we know it worked
      return { id: documentId, status: newStatus };
    }

    console.log("Updated document fetched:", updatedDoc);
    return updatedDoc;
  } catch (err) {
    console.error("Unexpected error in updateDocumentStatus:", err);
    return null;
  }
}

// Get current user's profile
export async function getCurrentUserProfile() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Unexpected error:", err);
    return null;
  }
}
