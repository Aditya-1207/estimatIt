import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Calendar, Package, RefreshCw } from "lucide-react";
import type { SSRVersion } from "@shared/schema";

interface SSRManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVersion?: SSRVersion;
}

export default function SSRManagementModal({ isOpen, onClose, activeVersion }: SSRManagementModalProps) {
  const [formData, setFormData] = useState({
    version: "",
    description: "",
    effectiveDate: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload SSR file mutation
  const uploadSSRMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/ssr-upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "SSR file uploaded and processed successfully",
      });
      
      // Reset form
      setFormData({
        version: "",
        description: "",
        effectiveDate: "",
      });
      setSelectedFile(null);
      setUploadProgress(0);
      setIsProcessing(false);
      
      // Invalidate SSR versions query
      queryClient.invalidateQueries({
        queryKey: ["/api/ssr-versions"],
      });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload SSR file",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Error",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "Error",
          description: "File size must be less than 50MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.version || !formData.effectiveDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    const uploadFormData = new FormData();
    uploadFormData.append("ssrFile", selectedFile);
    uploadFormData.append("version", formData.version);
    uploadFormData.append("description", formData.description);
    uploadFormData.append("effectiveDate", formData.effectiveDate);

    uploadSSRMutation.mutate(uploadFormData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SSR Management</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current SSR Status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-primary mb-3">Current Active SSR</h3>
              {activeVersion ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-secondary">Version:</p>
                    <p className="font-medium text-primary">{activeVersion.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Effective Date:</p>
                    <p className="font-medium">{new Date(activeVersion.effectiveDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Total Items:</p>
                    <p className="font-medium">{activeVersion.totalItems} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Last Updated:</p>
                    <p className="font-medium">{new Date(activeVersion.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-secondary">No active SSR version found</p>
              )}
            </CardContent>
          </Card>

          {/* Upload New SSR */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-primary mb-4">Upload New SSR File</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload */}
                <div>
                  <Label>SSR File (PDF) *</Label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("ssrFileInput")?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-secondary" />
                    <p className="text-secondary">
                      {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-secondary mt-1">PDF files only, max 50MB</p>
                    <input
                      id="ssrFileInput"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Version and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="version">SSR Version *</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="e.g., SSR 2023-24"
                    />
                  </div>
                  <div>
                    <Label htmlFor="effectiveDate">Effective Date *</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of changes or updates..."
                    rows={3}
                  />
                </div>

                {/* Processing Status */}
                {isProcessing && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-warning" />
                        <span className="text-sm font-medium text-warning">Processing PDF...</span>
                      </div>
                      <Progress value={uploadProgress} className="mb-2" />
                      <p className="text-xs text-secondary">
                        Extracting item codes, descriptions, and rates...
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={uploadSSRMutation.isPending}
                  >
                    {uploadSSRMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload & Process
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
