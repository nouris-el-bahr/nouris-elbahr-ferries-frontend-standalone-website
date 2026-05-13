"use client";

import React from "react";
import { Card, CardContent, FormField } from "@/shared";
import { MESSAGES } from "@/constants";

interface PaymentReportFormProps {
  stepNumber?: number;
  factDate: string;
  periodStart: string;
  periodEnd: string;
  errors?: Record<string, string>;
  onFactDateChange: (date: string) => void;
  onPeriodStartChange: (date: string) => void;
  onPeriodEndChange: (date: string) => void;
}

export const PaymentReportForm: React.FC<PaymentReportFormProps> = ({
  stepNumber,
  factDate,
  periodStart,
  periodEnd,
  errors = {},
  onFactDateChange,
  onPeriodStartChange,
  onPeriodEndChange,
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
            {stepNumber && <span className="step-badge">{stepNumber}</span>}
            {MESSAGES.REPORTS.PAYMENT.BILLING_PERIOD}
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              name="factDate"
              label={MESSAGES.REPORTS.PAYMENT.DOWNLOAD_DATE}
              type="date"
              value={factDate}
              onChange={(e) => onFactDateChange(e.target.value)}
              error={errors.factDate}
              required
            />

            <FormField
              name="periodStart"
              label={MESSAGES.REPORTS.PAYMENT.PERIOD_START}
              type="date"
              value={periodStart}
              onChange={(e) => onPeriodStartChange(e.target.value)}
              error={errors.periodStart}
              required
            />

            <FormField
              name="periodEnd"
              label={MESSAGES.REPORTS.PAYMENT.PERIOD_END}
              type="date"
              value={periodEnd}
              onChange={(e) => onPeriodEndChange(e.target.value)}
              error={errors.periodEnd}
              required
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
