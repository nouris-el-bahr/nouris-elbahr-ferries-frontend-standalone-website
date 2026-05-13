"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setFactDate,
  setPeriodStart,
  setPeriodEnd,
  setError as setPayError,
  clearError,
  runPaymentReport,
} from "@/store/slices/paymentSlice";
import { addResults } from "@/store/slices/resultsSlice";
import { PageContainer, PageHeader, Button, Alert, Input, Spinner } from "@/shared";
import {
  PaymentReportForm,
  ReferenceFileSelector,
  ReportResults,
  StepIndicator,
} from "@/features/reports/components";
import { triggerDownload } from "@/lib/engine/fileLoaders";
import { MESSAGES } from "@/constants";

export default function PaymentPage() {
  const dispatch = useAppDispatch();
  const pay = useAppSelector((s) => s.payment);

  const [refFolderPath, setRefFolderPath] = useState("");
  const [refFolderFiles, setRefFolderFiles] = useState<File[] | undefined>();
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refFileType, setRefFileType] = useState<"Csv" | "Xlsx">("Csv");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter reference files by type
  useEffect(() => {
    if (!refFolderFiles || refFolderFiles.length === 0) {
      setRefFiles([]);
      return;
    }

    const extensions = refFileType === "Csv" ? [".csv"] : [".xlsx", ".xls"];
    const filtered = refFolderFiles.filter((f) =>
      extensions.includes(
        f.name.substring(f.name.lastIndexOf(".")).toLowerCase(),
      ),
    );

    setRefFiles(filtered);

    if (filtered.length === 0 && refFolderPath) {
      dispatch(
        setPayError(
          `Aucun fichier ${refFileType === "Csv" ? "CSV" : "Excel"} trouvé`,
        ),
      );
    }
  }, [refFolderFiles, refFileType, dispatch, refFolderPath]);

  const handleRun = async () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (refFiles.length === 0) {
      newErrors.files =
        "Veuillez sélectionner un dossier avec des fichiers de référence.";
    }
    if (!invoiceFile) {
      newErrors.invoice = "Veuillez sélectionner le fichier de facture.";
    }
    if (!pay.factDate) {
      newErrors.factDate = "Veuillez renseigner la date de téléchargement.";
    }
    if (!pay.periodStart) {
      newErrors.periodStart = "Veuillez renseigner la date de début.";
    }
    if (!pay.periodEnd) {
      newErrors.periodEnd = "Veuillez renseigner la date de fin.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      dispatch(setPayError("Veuillez remplir tous les champs obligatoires."));
      return;
    }

    dispatch(clearError());
    setResult(null);
    setErrors({});

    try {
      const res = await dispatch(
        runPaymentReport({
          refFiles,
          invoiceFile: invoiceFile!,
          factDate: pay.factDate,
          periodStart: pay.periodStart,
          periodEnd: pay.periodEnd,
        }),
      ).unwrap();

      setResult(res);

      // Download files
      triggerDownload(res.paymentGroupedBlob, res.paymentGroupedName);
      triggerDownload(res.factureBlob, res.factureName);
      triggerDownload(res.updatedRefBlob, res.updatedRefName);

      // Track in results
      const now = Date.now();
      dispatch(
        addResults([
          {
            id: `payment-grouped-${now}`,
            name: res.paymentGroupedName,
            type: "payment",
            timestamp: now,
            status: "success",
          },
          {
            id: `facture-${now}`,
            name: res.factureName,
            type: "payment",
            timestamp: now,
            status: "success",
          },
        ]),
      );
    } catch (e) {
      dispatch(setPayError(e instanceof Error ? e.message : "Erreur inconnue"));
    }
  };

  const steps = [
    { number: 1, label: "Référence", completed: refFolderPath !== "" },
    { number: 2, label: "Facture", completed: invoiceFile !== null },
    {
      number: 3,
      label: "Dates",
      completed: !!pay.factDate && !!pay.periodStart && !!pay.periodEnd,
    },
  ];

  return (
    <>
      <PageHeader
        title={MESSAGES.REPORTS.PAYMENT.TITLE}
        description={MESSAGES.REPORTS.PAYMENT.DESCRIPTION}
      />

      <PageContainer maxWidth="lg">
        <StepIndicator
          steps={steps}
          currentStep={refFolderPath === "" ? 1 : invoiceFile === null ? 2 : 3}
        />

        {pay.error && (
          <Alert
            variant="error"
            title={MESSAGES.COMMON.ERROR}
            description={pay.error}
            dismissible
            onClose={() => dispatch(clearError())}
            className="mb-6"
          />
        )}

        {/* Step 1: Reference Folder */}
        <ReferenceFileSelector
          label="Dossier de rapports"
          folderPath={refFolderPath}
          files={refFiles}
          fileType={refFileType}
          disabled={pay.running}
          onFolderSelect={(path, files) => {
            setRefFolderPath(path);
            setRefFolderFiles(files);
          }}
          onFileTypeChange={setRefFileType}
        />

        {/* Step 2: Invoice File */}
        {refFolderPath && (
          <div className="card mb-5 mt-6">
            <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
              <span className="step-badge">2</span>
              {MESSAGES.REPORTS.PAYMENT.SELECT_INVOICE_FILE}
            </h2>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              label="Fichier CSV ou Excel"
              helperText={invoiceFile ? `✓ ${invoiceFile.name}` : undefined}
              onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
              disabled={pay.running}
            />
            {errors.invoice && (
              <p className="text-error text-sm mt-2">{errors.invoice}</p>
            )}
          </div>
        )}

        {/* Step 3: Dates */}
        {invoiceFile && (
          <PaymentReportForm
            factDate={pay.factDate}
            periodStart={pay.periodStart}
            periodEnd={pay.periodEnd}
            errors={errors}
            onFactDateChange={(date) => dispatch(setFactDate(date))}
            onPeriodStartChange={(date) => dispatch(setPeriodStart(date))}
            onPeriodEndChange={(date) => dispatch(setPeriodEnd(date))}
          />
        )}

        {/* Run Button */}
        {invoiceFile && (
          <div className="card mb-5 mt-6">
            <Button
              onClick={handleRun}
              disabled={pay.running || refFiles.length === 0 || !invoiceFile}
              isLoading={pay.running}
              isFullWidth
              variant="primary"
            >
              {pay.running
                ? MESSAGES.REPORTS.PAYMENT.GENERATING
                : MESSAGES.REPORTS.PAYMENT.GENERATE_BUTTON}
            </Button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="animate-slideInUp">
            <ReportResults
              title={MESSAGES.REPORTS.PAYMENT.SUCCESS}
              files={[
                {
                  name: result.paymentGroupedName,
                  blob: result.paymentGroupedBlob,
                },
                { name: result.factureName, blob: result.factureBlob },
                { name: result.updatedRefName, blob: result.updatedRefBlob },
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
      {pay.running && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
          <Spinner size="lg" text="Génération en cours..." />
        </div>
      )}
    </>
  );
}
