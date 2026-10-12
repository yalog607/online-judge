import "server-only";
import { execProc } from "@/db/exec";

export interface DocumentItem {
  DocumentID: number;
  ClassID: number;
  FileName: string;
  CloudinaryURL: string;
  Category: string | null;
  UploadDate: string;
}

export interface IDocumentRepository {
  addDocument(
    classId: number,
    userId: number,
    input: { fileName: string; cloudinaryUrl: string; category?: string | null }
  ): Promise<DocumentItem>;

  deleteDocument(documentId: number, userId: number): Promise<boolean>;

  listDocuments(
    classId: number,
    userId: number,
    category?: string | null
  ): Promise<DocumentItem[]>;

  getDocument(
    documentId: number,
    userId: number
  ): Promise<DocumentItem | null>;
}

export class DocumentRepository implements IDocumentRepository {
  async addDocument(
    classId: number,
    userId: number,
    input: { fileName: string; cloudinaryUrl: string; category?: string | null }
  ): Promise<DocumentItem> {
    const { rows } = await execProc<DocumentItem>("usp_Document_Add", {
      ClassID: classId,
      UserID: userId,
      FileName: input.fileName,
      CloudinaryURL: input.cloudinaryUrl,
      Category: input.category ?? null,
    });
    return rows[0];
  }

  async deleteDocument(documentId: number, userId: number): Promise<boolean> {
    await execProc("usp_Document_Delete", {
      DocumentID: documentId,
      UserID: userId,
    });
    return true;
  }

  async listDocuments(
    classId: number,
    userId: number,
    category?: string | null
  ): Promise<DocumentItem[]> {
    const { rows } = await execProc<DocumentItem>("usp_Document_List", {
      ClassID: classId,
      UserID: userId,
      Category: category ?? null,
    });
    return rows;
  }

  async getDocument(
    documentId: number,
    userId: number
  ): Promise<DocumentItem | null> {
    const { rows } = await execProc<DocumentItem>("usp_Document_Get", {
      DocumentID: documentId,
      UserID: userId,
    });
    return rows[0] ?? null;
  }
}

export const documentRepository: IDocumentRepository = new DocumentRepository();
