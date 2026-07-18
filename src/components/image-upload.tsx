"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { mediaApiRequest } from "@/apiRequests/media";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Image picker that uploads to the backend (-> MinIO) and reports back the
 * public URL via onChange. Also allows pasting a URL manually as a fallback.
 */
type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
};

export default function ImageUpload({
  value,
  onChange,
  folder = "articles",
}: ImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await mediaApiRequest.upload(file, folder);
      onChange(res.payload.data.url);
      toast({ title: "Tải ảnh thành công" });
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "Tải ảnh thất bại", variant: "destructive" });
    } finally {
      setUploading(false);
      // Reset so selecting the same file again still triggers change
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className="h-32 w-32 rounded-md border object-cover"
        />
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          No image
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? "Đang tải..." : "Chọn ảnh"}
      </Button>

      <Input
        placeholder="hoặc dán URL ảnh"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
