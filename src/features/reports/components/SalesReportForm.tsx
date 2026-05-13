"use client";

import React from "react";
import { Card, CardContent, FormField, Select, Checkbox } from "@/shared";
import { MESSAGES, SALES_MODES } from "@/constants";

interface SalesReportFormProps {
  stepNumber?: number;
  downloadDate: string;
  format: string;
  vatSuffix: string;
  mode: string;
  onlyCheckedIn: boolean;
  hideFormat?: boolean;
  errors?: Record<string, string>;
  onDownloadDateChange: (date: string) => void;
  onFormatChange: (format: string) => void;
  onVatSuffixChange: (suffix: string) => void;
  onModeChange: (mode: string) => void;
  onOnlyCheckedInChange: (checked: boolean) => void;
}

export const SalesReportForm: React.FC<SalesReportFormProps> = ({
  stepNumber,
  downloadDate,
  format,
  vatSuffix,
  mode,
  onlyCheckedIn,
  hideFormat = false,
  errors = {},
  onDownloadDateChange,
  onFormatChange,
  onVatSuffixChange,
  onModeChange,
  onOnlyCheckedInChange,
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
            {stepNumber && <span className="step-badge">{stepNumber}</span>}
            {MESSAGES.REPORTS.SALES.PARAMETERS}
          </h2>

          <div className={`grid gap-4 ${hideFormat ? "grid-cols-2" : "grid-cols-2"}`}>
            <FormField
              name="downloadDate"
              label={MESSAGES.REPORTS.SALES.DOWNLOAD_DATE}
              type="date"
              value={downloadDate}
              onChange={(e) => onDownloadDateChange(e.target.value)}
              error={errors.downloadDate}
              required
            />

            {!hideFormat && (
              <Select
                name="format"
                label={MESSAGES.REPORTS.SALES.FORMAT}
                value={format}
                onChange={(e) => onFormatChange(e.target.value)}
                options={[
                  { value: "Csv", label: "CSV" },
                  { value: "Xlsx", label: "Excel" },
                ]}
                error={errors.format}
              />
            )}

            <FormField
              name="vatSuffix"
              label={MESSAGES.REPORTS.SALES.VAT_SUFFIX}
              type="text"
              value={vatSuffix}
              onChange={(e) => onVatSuffixChange(e.target.value)}
              error={errors.vatSuffix}
            />

            <Select
              name="mode"
              label={MESSAGES.REPORTS.SALES.MODE}
              value={mode}
              onChange={(e) => onModeChange(e.target.value)}
              options={[
                { value: "short", label: SALES_MODES.SHORT },
                { value: "detailed", label: SALES_MODES.DETAILED },
              ]}
              error={errors.mode}
            />
          </div>

          <div className="pt-2">
            <Checkbox
              id="onlyCheckedIn"
              label={MESSAGES.REPORTS.SALES.ONLY_CHECKED_IN}
              checked={onlyCheckedIn}
              onChange={(e) => onOnlyCheckedInChange(e.target.checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
