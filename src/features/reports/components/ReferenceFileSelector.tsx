"use client";

import React from "react";
import { Card, CardContent, Select } from "@/shared";
import FolderSelector from "@/components/FolderSelector";
import { MESSAGES } from "@/constants";

interface ReferenceFolderSelectorProps {
  label: string;
  folderPath: string;
  files: File[];
  fileType: "Csv" | "Xlsx";
  disabled?: boolean;
  onFolderSelect: (path: string, files?: File[]) => void;
  onFileTypeChange: (type: "Csv" | "Xlsx") => void;
}

export const ReferenceFileSelector: React.FC<ReferenceFolderSelectorProps> = ({
  label,
  folderPath,
  files,
  fileType,
  disabled = false,
  onFolderSelect,
  onFileTypeChange,
}) => {
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <FolderSelector
            label={label}
            hint={MESSAGES.REPORTS.PAYMENT.REFERENCE_FILES_HINT}
            onFolderSelect={onFolderSelect}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {folderPath && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <Select
                  name="fileType"
                  value={fileType}
                  onChange={(e) =>
                    onFileTypeChange(e.target.value as "Csv" | "Xlsx")
                  }
                  options={[
                    { value: "Csv", label: "CSV" },
                    { value: "Xlsx", label: "Excel" },
                  ]}
                  disabled={disabled}
                />
              </div>

              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-2 p-3 rounded bg-nouris-navy/10 border border-nouris-navy/20"
                    >
                      <span className="text-nouris-navy">✓</span>
                      <span className="text-sm font-mono text-gray-800">
                        {file.name}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">
                    {files.length} fichier(s) sélectionné(s) et fusionné(s)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">
                  Aucun fichier{" "}
                  {fileType === "Csv" ? "CSV" : "Excel"} trouvé
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
