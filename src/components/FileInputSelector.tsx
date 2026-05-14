"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button, Select } from "@/shared";

interface FileTypeOption {
  value: string;
  label: string;
}

interface FileInputSelectorProps {
  label: string;
  hint?: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  fileType?: string;
  onFileTypeChange?: (type: string) => void;
  fileTypeOptions?: FileTypeOption[];
  accept?: string;
  selectedFile?: File | null;
}

export default function FileInputSelector({
  label,
  hint,
  onFileSelect,
  disabled = false,
  fileType,
  onFileTypeChange,
  fileTypeOptions,
  accept,
  selectedFile,
}: FileInputSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  const handleSelectFile = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
    e.target.value = "";
  };

  const handleClear = () => {
    setSelectedFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileSelect(null);
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          {selectedFileName || selectedFile?.name ? (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <p className="text-sm font-mono text-gray-700 truncate">
                {selectedFileName || selectedFile?.name}
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 ml-2 shrink-0"
                title="Effacer"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucun fichier sélectionné</p>
          )}
        </div>
        {fileTypeOptions && fileType !== undefined && onFileTypeChange && (
          <div className="w-32">
            <Select
              name="fileType"
              value={fileType}
              onChange={(e) => onFileTypeChange(e.target.value)}
              options={fileTypeOptions}
              disabled={disabled}
            />
          </div>
        )}
        <Button
          onClick={handleSelectFile}
          disabled={disabled}
          variant="secondary"
          className="shrink-0"
          leftIcon={<Upload size={15} />}
        >
          Sélectionner
        </Button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept={accept}
      />
    </div>
  );
}
