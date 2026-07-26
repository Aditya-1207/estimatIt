import type { Project, RecapitulationItem } from "@estimatit/shared";
import type { MeasurementBlockWithDetails } from "../api/measurements";

export interface ExportWarning {
  blockSequence: number;
  blockLabel: string;
  message: string;
}

export interface ExportOptions {
  project: Project;
  blocks: MeasurementBlockWithDetails[];
  ssrVersionLabel?: string;
  /** Recapitulation items for Sheet 3/Section 3. If omitted, it is skipped. */
  recapItems?: RecapitulationItem[];
  /** Optional progress callback: called with fraction 0–1 (primarily used by Excel). */
  onProgress?: (fraction: number) => void;
}
