import { AlertTriangle, FileSpreadsheet, X } from "lucide-react";
import type { ExportWarning } from "../../lib/excelExport";

interface ExportValidationDialogProps {
  warnings: ExportWarning[];
  isOpen: boolean;
  onClose: () => void;
  onExportAnyway: () => void;
}

export function ExportValidationDialog({
  warnings,
  isOpen,
  onClose,
  onExportAnyway,
}: ExportValidationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative mx-4 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-amber-500/5 px-6 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-foreground">Export Warnings</h2>
              <p className="text-sm text-muted-foreground">
                {warnings.length} issue{warnings.length !== 1 ? "s" : ""} found before export
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Warning List */}
          <div className="max-h-64 overflow-y-auto px-6 py-4">
            <ul className="space-y-3">
              {warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600">
                    {w.blockSequence}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {w.blockLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">{w.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <button
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={onExportAnyway}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
