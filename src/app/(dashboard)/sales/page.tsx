"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setDownloadDate,
  setVatSuffix,
  setFormat,
  setMode,
  setOnlyCheckedIn,
  setSplitByDeparture,
  setError as setSalesError,
  clearError,
  runSalesReport,
} from "@/store/slices/salesSlice";
import { addResults } from "@/store/slices/resultsSlice";
import { PageContainer, PageHeader, Button, Alert, Spinner, Card } from "@/shared";
import {
  SalesReportForm,
  StepIndicator,
  ReportResults,
} from "@/features/reports/components";
import { FolderFileTypeSelector } from "@/components/FolderFileTypeSelector";
import { triggerDownload } from "@/lib/engine/fileLoaders";
import { MESSAGES } from "@/constants";

export default function SalesPage() {
  const dispatch = useAppDispatch();
  const sales = useAppSelector((s) => s.sales);

  const [salesFolderPath, setSalesFolderPath] = useState("");
  const [salesFolderFiles, setSalesFolderFiles] = useState<
    File[] | undefined
  >();
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRun = async () => {
    const newErrors: Record<string, string> = {};

    if (!salesFolderFiles || salesFolderFiles.length === 0) {
      newErrors.files = "Veuillez sélectionner des fichiers";
    }
    if (!sales.downloadDate) {
      newErrors.downloadDate = "Veuillez renseigner la date de téléchargement";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      dispatch(setSalesError("Veuillez remplir tous les champs obligatoires."));
      return;
    }

    dispatch(clearError());
    setResult(null);
    setErrors({});

    try {
      const config = {
        downloadDate: sales.downloadDate,
        vatSuffix: sales.vatSuffix,
        format: sales.format as "Csv" | "Xlsx",
        mode: sales.mode as "short" | "detailed",
        onlyCheckedIn: sales.onlyCheckedIn,
        splitByDeparture: sales.splitByDeparture,
      };

      const res = await dispatch(
        runSalesReport({ config, files: salesFolderFiles! }),
      ).unwrap();

      setResult(res);

      // Track in results
      const now = Date.now();
      dispatch(
        addResults([
          {
            id: `sales-short-${now}`,
            name: res.salesShortName,
            type: "sales",
            timestamp: now,
            status: "success",
          },
          {
            id: `sales-invoice-${now}`,
            name: res.salesInvoiceName,
            type: "sales",
            timestamp: now,
            status: "success",
          },
        ]),
      );
    } catch (e) {
      dispatch(
        setSalesError(e instanceof Error ? e.message : "Erreur inconnue"),
      );
    }
  };

  const steps = [
    { number: 1, label: "Fichiers", completed: salesFolderPath !== "" },
    {
      number: 2,
      label: "Paramètres",
      completed: !!sales.downloadDate,
    },
    { number: 3, label: "Générer", completed: !!result },
  ];

  return (
    <>
      <PageHeader
        title={MESSAGES.REPORTS.SALES.TITLE}
        description={MESSAGES.REPORTS.SALES.DESCRIPTION}
      />

      <PageContainer>
        <StepIndicator
          steps={steps}
          currentStep={
            salesFolderPath === ""
              ? 1
              : !sales.downloadDate
                ? 2
                : result
                  ? 3
                  : 2
          }
          className="mb-6"
        />

        {sales.error && (
          <Alert
            variant="error"
            title={MESSAGES.COMMON.ERROR}
            description={sales.error}
            dismissible
            onClose={() => dispatch(clearError())}
            className="mb-6"
          />
        )}

        {/* Step 1: File Selection - Format and Folder */}
        <FolderFileTypeSelector
          stepNumber={1}
          title={MESSAGES.REPORTS.SALES.SELECT_FILES_FOLDER}
          label={MESSAGES.REPORTS.SALES.SELECT_FILES_FOLDER_LABEL}
          hint={MESSAGES.REPORTS.SALES.REFERENCE_FILES_HINT}
          folderPath={salesFolderPath}
          files={salesFolderFiles || []}
          selectedFiles={salesFolderFiles || []}
          fileType={sales.format}
          onFolderSelect={(path, files) => {
            setSalesFolderPath(path);
            setSalesFolderFiles(files);
          }}
          onFileTypeChange={(format) => dispatch(setFormat(format))}
          fileTypeOptions={[
            { value: "Csv", label: "CSV" },
            { value: "Xlsx", label: "Excel" },
          ]}
          disabled={sales.running}
        />

        {/* Step 2: Settings */}
        {salesFolderPath && (
          <>
            <SalesReportForm
              stepNumber={2}
              downloadDate={sales.downloadDate}
              format={sales.format}
              vatSuffix={sales.vatSuffix}
              mode={sales.mode}
              onlyCheckedIn={sales.onlyCheckedIn}
              splitByDeparture={sales.splitByDeparture}
              hideFormat={true}
              errors={errors}
              onDownloadDateChange={(date) => dispatch(setDownloadDate(date))}
              onFormatChange={(format) => dispatch(setFormat(format))}
              onVatSuffixChange={(suffix) => dispatch(setVatSuffix(suffix))}
              onModeChange={(mode) => dispatch(setMode(mode))}
              onOnlyCheckedInChange={(checked) =>
                dispatch(setOnlyCheckedIn(checked))
              }
              onSplitByDepartureChange={(checked) =>
                dispatch(setSplitByDeparture(checked))
              }
            />

            {/* Run Button */}
            <Card className="mb-6">
              <div className="px-6 py-4">
                <Button
                  onClick={handleRun}
                  disabled={sales.running || salesFolderFiles === undefined}
                  isLoading={sales.running}
                  isFullWidth
                  variant="primary"
                >
                  {sales.running
                    ? MESSAGES.REPORTS.SALES.GENERATING
                    : MESSAGES.REPORTS.SALES.GENERATE_BUTTON}
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Results */}
        {result && (
          <div className="animate-slideInUp">
            <ReportResults
              title={MESSAGES.REPORTS.SALES.SUCCESS}
              files={[
                { name: result.salesShortName, blob: result.salesShortBlob },
                {
                  name: result.salesInvoiceName,
                  blob: result.salesInvoiceBlob,
                },
                {
                  name: result.salesInvoiceControlName,
                  blob: result.salesInvoiceControlBlob,
                },
                ...(result.salesControlNourisBlob
                  ? [
                      {
                        name: result.salesControlNourisName,
                        blob: result.salesControlNourisBlob,
                      },
                    ]
                  : []),
                ...(result.salesControlGsaBlob
                  ? [
                      {
                        name: result.salesControlGsaName,
                        blob: result.salesControlGsaBlob,
                      },
                    ]
                  : []),
                ...(result.salesDetailedBlob
                  ? [
                      {
                        name: result.salesDetailedName,
                        blob: result.salesDetailedBlob,
                      },
                    ]
                  : []),
                ...(result.salesSplitByDepartureBlob
                  ? [
                      {
                        name: result.salesSplitByDepartureName,
                        blob: result.salesSplitByDepartureBlob,
                      },
                    ]
                  : []),
                ...(result.salesInvoicePdfBlob
                  ? [
                      {
                        name: result.salesInvoicePdfName,
                        blob: result.salesInvoicePdfBlob,
                      },
                    ]
                  : []),
              ]}
              onDownload={triggerDownload}
            />

            <div className="mt-6">
              <Button
                onClick={() => {
                  setResult(null);
                  dispatch(clearError());
                }}
                variant="outline"
                isFullWidth
              >
                Générer un nouveau rapport
              </Button>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Processing Overlay */}
      {sales.running && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
          <Spinner size="lg" text="Génération en cours..." />
        </div>
      )}
    </>
  );
}
