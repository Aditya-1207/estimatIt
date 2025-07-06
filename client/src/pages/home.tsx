import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Settings, Home as HomeIcon, HelpCircle, Download } from "lucide-react";
import BOQInputForm from "@/components/boq-input-form";
import LivePreviewTable from "@/components/live-preview-table";
import SSRManagementModal from "@/components/ssr-management-modal";
import type { SSRVersion, Project } from "@shared/schema";

export default function Home() {
  const [showSSRModal, setShowSSRModal] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [workOrderNo, setWorkOrderNo] = useState("");
  const { toast } = useToast();

  // Fetch active SSR version
  const { data: activeSSRVersion } = useQuery<SSRVersion>({
    queryKey: ["/api/ssr-versions/active"],
  });

  // Create initial project if none exists
  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    const projectId = `project-${Date.now()}`;
    const newProject: Project = {
      id: projectId,
      name: projectName,
      workOrderNo: workOrderNo || undefined,
      totalAmount: 0,
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCurrentProject(newProject);
    toast({
      title: "Success",
      description: "Project created successfully",
    });
  };

  const handleExportExcel = async () => {
    if (!currentProject) {
      toast({
        title: "Error",
        description: "Please create a project first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/export/excel/${currentProject.id}`);
      if (!response.ok) throw new Error("Export failed");
      
      const data = await response.json();
      console.log("Export data:", data);
      
      toast({
        title: "Success",
        description: "Excel export functionality will be implemented",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Navigation */}
      <nav className="bg-surface-variant shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary">Maharashtra PWD</h1>
                <p className="text-xs text-secondary">BOQ Estimation Tool</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-8">
                <a href="#" className="text-primary hover:text-primary px-3 py-2 text-sm font-medium border-b-2 border-primary flex items-center space-x-1">
                  <HomeIcon size={16} />
                  <span>Home</span>
                </a>
                <button
                  onClick={() => setShowSSRModal(true)}
                  className="text-secondary hover:text-primary px-3 py-2 text-sm font-medium flex items-center space-x-1"
                >
                  <Settings size={16} />
                  <span>SSR Management</span>
                </button>
                <a href="#" className="text-secondary hover:text-primary px-3 py-2 text-sm font-medium flex items-center space-x-1">
                  <FileText size={16} />
                  <span>Templates</span>
                </a>
                <a href="#" className="text-secondary hover:text-primary px-3 py-2 text-sm font-medium flex items-center space-x-1">
                  <HelpCircle size={16} />
                  <span>Help</span>
                </a>
              </nav>
              <Button onClick={handleExportExcel} className="bg-primary text-white hover:bg-blue-700">
                <Download size={16} className="mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Current SSR Status */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                Currently using: <span className="font-bold">{activeSSRVersion?.version || "Loading..."}</span>
              </span>
              {activeSSRVersion && (
                <span className="text-xs text-secondary">
                  | Last updated: {new Date(activeSSRVersion.effectiveDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSSRModal(true)}
              className="text-primary hover:text-blue-700"
            >
              <Settings size={16} className="mr-1" />
              Manage SSR
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentProject ? (
          /* Project Creation Form */
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="workOrderNo">Work Order No.</Label>
                  <Input
                    id="workOrderNo"
                    value={workOrderNo}
                    onChange={(e) => setWorkOrderNo(e.target.value)}
                    placeholder="Enter work order number (optional)"
                  />
                </div>
                <Button onClick={handleCreateProject} className="w-full">
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Main BOQ Interface */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <BOQInputForm project={currentProject} onProjectUpdate={setCurrentProject} />
            </div>
            <div className="lg:col-span-7">
              <LivePreviewTable project={currentProject} />
            </div>
          </div>
        )}
      </div>

      {/* SSR Management Modal */}
      {showSSRModal && (
        <SSRManagementModal
          isOpen={showSSRModal}
          onClose={() => setShowSSRModal(false)}
          activeVersion={activeSSRVersion}
        />
      )}
    </div>
  );
}
