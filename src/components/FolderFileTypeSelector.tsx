"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/shared";
import FolderSelector from "@/components/FolderSelector";

interface FileTypeOption {
  value: string;
  label: string;
}

interface FolderFileTypeSelectorProps {
  stepNumber?: number;
  title: string;
  label: string;
  hint?: string;
  folderPath: string;
  files: File[];
  selectedFiles: File[];
  fileType: string;
  onFolderSelect: (path: string, files?: File[]) => void;
  onFileTypeChange: (type: string) => void;
  fileTypeOptions: FileTypeOption[];
  disabled?: boolean;
}

export const FolderFileTypeSelector: React.FC<FolderFileTypeSelectorProps> = ({
  stepNumber,
  title,
  label,
  hint,
  folderPath,
  selectedFiles,
  fileType,
  onFolderSelect,
  onFileTypeChange,
  fileTypeOptions,
  disabled = false,
}) => {
  const [displayFiles, setDisplayFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setDisplayFiles([]);
      return;
    }

    const extensions = fileType === "Csv" ? [".csv"] : [".xlsx", ".xls"];
    const filtered = selectedFiles.filter((f) =>
      extensions.includes(f.name.substring(f.name.lastIndexOf(".")).toLowerCase())
    );

    setDisplayFiles(filtered);
  }, [selectedFiles, fileType]);

  return (
    <>
      {/* Folder Selection Card */}
      <Card className="mb-6">
        <div className="px-6 py-4">
          {stepNumber && (
            <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
              <span className="step-badge">{stepNumber}</span>
              {title}
            </h2>
          )}
          <FolderSelector
            label={label}
            hint={hint}
            onFolderSelect={onFolderSelect}
            disabled={disabled}
            fileType={fileType}
            onFileTypeChange={onFileTypeChange}
            fileTypeOptions={fileTypeOptions}
          />
        </div>
      </Card>

      {/* Files List Card */}
      {folderPath && (
        <Card className="mb-6">
          <div className="px-6 py-4">
            {displayFiles.length > 0 ? (
              <div className="space-y-2">
                {displayFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <span className="text-gray-700">✓</span>
                    <span className="text-sm font-mono text-gray-800">
                      {file.name}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">
                  {displayFiles.length} fichier(s) sélectionné(s)
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">
                Aucun fichier {fileType === "Csv" ? "CSV" : "Excel"} trouvé
              </p>
            )}
          </div>
        </Card>
      )}
    </>
  );
};
