import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, BadgeCheck, X } from "lucide-react";
import type { SSRVersion } from "@shared/schema";

interface SSRManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVersion?: SSRVersion;
}

const EMPTY_FORM = { version: "", description: "", effectiveDate: "" };

export default function SSRManagementModal({ isOpen, onClose, activeVersion }: SSRManagementModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await fetch("/api/ssr-upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SSR updated successfully" });
      setFormData(EMPTY_FORM);
      setSelectedFile(null);
      setProgress(0);
      queryClient.invalidateQueries({ queryKey: ["/api/ssr-versions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ssr-versions/active"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Upload failed. Please try again.", variant: "destructive" });
    },
  });

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File must be under 50 MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast({ title: "Please select a PDF file", variant: "destructive" }); return; }
    if (!formData.version || !formData.effectiveDate) { toast({ title: "Please fill in all required fields", variant: "destructive" }); return; }

    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + 12, 88);
      setProgress(p);
      if (p >= 88) clearInterval(interval);
    }, 400);

    const fd = new FormData();
    fd.append("ssrFile", selectedFile);
    fd.append("version", formData.version);
    fd.append("description", formData.description);
    fd.append("effectiveDate", formData.effectiveDate);
    uploadMutation.mutate(fd);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">SSR Management</DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">State Schedule of Rates</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Current version */}
          {activeVersion && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Currently Active</p>
                <p className="text-sm text-green-700 mt-0.5">
                  <span className="font-bold">{activeVersion.version}</span>
                  {" · "}
                  {new Date(activeVersion.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  {" · "}
                  {activeVersion.totalItems} items
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upload New SSR</p>

            {/* File drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => document.getElementById("ssrFileInput")?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${isDragging ? "border-blue-400 bg-blue-50" : selectedFile ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"}`}
            >
              <Upload className={`w-7 h-7 mx-auto mb-2 ${selectedFile ? "text-green-500" : "text-gray-400"}`} />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-green-700">{selectedFile.name}</p>
                  <p className="text-xs text-green-600 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB · PDF</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Drop PDF here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF only · Max 50 MB</p>
                </div>
              )}
              <input id="ssrFileInput" type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {/* Version + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[15px] font-semibold text-gray-800">
                  Version Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g. SSR 2024-25"
                  className="h-11 text-base border-gray-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[15px] font-semibold text-gray-800">
                  Effective Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="h-11 text-base border-gray-200 rounded-xl"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[15px] font-semibold text-gray-800">
                Notes <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summary of changes in this version…"
                rows={2}
                className="text-base border-gray-200 rounded-xl resize-none"
              />
            </div>

            {/* Progress */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Processing PDF…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                disabled={uploadMutation.isPending}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Activate
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-12 px-5 rounded-xl border-gray-200 text-gray-600 font-medium"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
