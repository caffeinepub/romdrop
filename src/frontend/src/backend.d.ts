import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FileRecord {
    id: string;
    title: string;
    size: bigint;
    fileType: string;
    filename: string;
    blobId: string;
    uploadedAt: bigint;
}
export interface backendInterface {
    createFileRecord(title: string | null, filename: string, fileType: string, size: bigint, blobId: string): Promise<string>;
    deleteFile(id: string): Promise<void>;
    getAllFiles(): Promise<Array<FileRecord>>;
    getFileRecord(id: string): Promise<FileRecord | null>;
}
