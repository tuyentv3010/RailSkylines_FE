import http from "@/lib/http";

// Backend wraps ResUploadFileDTO inside RestResponse.data
export type UploadFileResType = {
  statusCode: number;
  error: string | null;
  message: string;
  data: {
    fileName: string;
    url: string;
    uploadedAt: string;
  };
};

export const mediaApiRequest = {
  // POST /api/v1/files (multipart: file + folder) -> uploads to MinIO, returns public URL
  upload: (file: File, folder: string = "articles") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    return http.post<UploadFileResType>("/api/v1/files", formData);
  },
};

export default mediaApiRequest;
