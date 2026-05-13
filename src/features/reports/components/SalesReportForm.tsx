"use client";

import React from "react";
import { Card, CardContent, FormField, Select, Checkbox } from "@/shared";
import { MESSAGES, SALES_MODES } from "@/constants";

interface SalesReportFormProps {
  downloadDate: string;
  format: string;
  vatSuffix: string;
  mode: string;
  onlyCheckedIn: boolean;
  errors?: Record<string, string>;
  onDownloadDateChange: (date: string) => void;
  onFormatChange: (format: string) => void;
  onVatSuffixChange: (suffix: string) => void;
  onModeChange: (mode: string) => void;
  onOnlyCheckedInChange: (checked: boolean) => void;
}

export const SalesReportForm: React.FC<SalesReportFormProps> = ({
  downloadDate,
  format,
  vatSuffix,
  mode,
  onlyCheckedIn,
  errors = {},
  onDownloadDateChange,
  onFormatChange,
  onVatSuffixChange,
  onModeChange,
  onOnlyCheckedInChange,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-nouris-navy mb-4">
            {MESSAGES.REPORTS.SALES.PARAMETERS}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="downloadDate"
              label={MESSAGES.REPORTS.SALES.DOWNLOAD_DATE}
              type="date"
              value={downloadDate}
              onChange={(e) => onDownloadDateChange(e.target.value)}
              error={errors.downloadDate}
              required
            />

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
