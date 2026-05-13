"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setDownloadDate,
  setVatSuffix,
  setFormat,
  setMode,
  setOnlyCheckedIn,
  setError as setSalesError,
  clearError,
  runSalesReport,
} from "@/store/slices/salesSlice";
import { addResults } from "@/store/slices/resultsSlice";
import { PageContainer, PageHeader, Button, Alert, Spinner } from "@/shared";
import {
  SalesReportForm,
  StepIndicator,
  ReportResults,
} from "@/features/reports/components";
import FolderSelector from "@/components/FolderSelector";
import { triggerDownload } from "@/lib/engine/fileLoaders";
import { MESSAGES } from "@/constants";

export default function SalesPage() {
  const dispatch = useAppDispatch();
  const sales = useAppSelector((s) => s.sales);

  const [salesFolderPath, setSalesFolderPath] = useState("");
  const [salesFolderFiles, setSalesFolderFiles] = useState<
    File[] | undefined
  >();
  const [salesFiles, setSalesFiles] = useState<
    { name: string; path: string; size: number }[]
  >([]);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter sales files by format
  useEffect(() => {
    if (!salesFolderFiles || salesFolderFiles.length === 0) {
      setSalesFiles([]);
      return;
    }

    const extensions = sales.format === "Csv" ? [".csv"] : [".xlsx", ".xls"];
    const filtered = salesFolderFiles.filter((f) =>
      extensions.includes(
        f.name.substring(f.name.lastIndexOf(".")).toLowerCase(),
      ),
    );

    setSalesFiles(
      filtered.map((f) => ({
        name: f.name,
        path: (f as any).webkitRelativePath || f.name,
        size: f.size,
      })),
    );

    if (filtered.length === 0 && salesFolderPath) {
      dispatch(
        setSalesError(
          `Aucun fichier ${sales.format === "Csv" ? "CSV" : "Excel"} trouvé`,
        ),
      );
    }
  }, [salesFolderFiles, sales.format, dispatch, salesFolderPath]);

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

      <PageContainer maxWidth="lg">
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

        {/* Step 1: File Selection */}
        <div className="card mb-5">
          <h2 className="font-semibold text-nouris-navy mb-4">
            1. {MESSAGES.REPORTS.SALES.SELECT_FILES}
          </h2>
          <FolderSelector
            label="Dossier de ventes"
            hint="Sélectionnez le dossier contenant vos fichiers CSV ou Excel"
            onFolderSelect={(path, files) => {
              setSalesFolderPath(path);
              setSalesFolderFiles(files);
            }}
            disabled={sales.running}
          />
        </div>

        {/* Step 2: Settings */}
        {salesFolderPath && (
          <>
            <SalesReportForm
              downloadDate={sales.downloadDate}
              format={sales.format}
              vatSuffix={sales.vatSuffix}
              mode={sales.mode}
              onlyCheckedIn={sales.onlyCheckedIn}
              errors={errors}
              onDownloadDateChange={(date) => dispatch(setDownloadDate(date))}
              onFormatChange={(format) => dispatch(setFormat(format))}
              onVatSuffixChange={(suffix) => dispatch(setVatSuffix(suffix))}
              onModeChange={(mode) => dispatch(setMode(mode))}
              onOnlyCheckedInChange={(checked) =>
                dispatch(setOnlyCheckedIn(checked))
              }
            />

            {/* List Files */}
            <div className="card mb-5 mt-6">
              <h2 className="font-semibold text-nouris-navy mb-4">
                3. {MESSAGES.REPORTS.SALES.FILES_DETECTED}
              </h2>
              {salesFiles.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {salesFiles.map((f) => (
                    <div
                      key={f.name}
                      className="text-sm text-gray-700 p-2 bg-gray-50 rounded flex items-center gap-2"
                    >
                      <span>✓</span>
                      <span>{f.name}</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">
                    {salesFiles.length} fichier(s) prêt(s)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">
                  Aucun fichier {sales.format === "Csv" ? "CSV" : "Excel"}{" "}
                  trouvé
                </p>
              )}
            </div>

            {/* Run Button */}
            <div className="card mb-5">
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
