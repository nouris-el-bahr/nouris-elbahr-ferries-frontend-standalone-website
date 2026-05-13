"use client";

import React from "react";
import { Card, Alert } from "@/shared";
import { Download } from "lucide-react";

interface ReportFile {
  name: string;
  blob: Blob;
}

interface ReportResultsProps {
  title: string;
  description?: string;
  files: ReportFile[];
  onDownload: (blob: Blob, filename: string) => void;
}

export const ReportResults: React.FC<ReportResultsProps> = ({
  title,
  description,
  files,
  onDownload,
}) => {
  return (
    <Card className="border-green-200 bg-green-50">
      <div className="px-6 py-4">
        <Alert
          variant="success"
          title={title}
          description={description}
          dismissible={false}
        />
      </div>

      <div className="px-6 pb-6 space-y-2">
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => onDownload(file.blob, file.name)}
            className="w-full flex items-center gap-2 text-left p-3 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
          >
            <Download size={16} />
            <span className="flex-1 truncate font-mono text-xs">
              {file.name}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
};
