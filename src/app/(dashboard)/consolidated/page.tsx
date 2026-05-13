"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setFactDate,
  setPeriodStart,
  setPeriodEnd,
  setError as setPayError,
  clearError,
} from "@/store/slices/paymentSlice";
import {
  setSnapshotFile,
  clearSnapshotFile,
} from "@/store/slices/snapshotsSlice";
import { addResults } from "@/store/slices/resultsSlice";
import { runConsolidated } from "@/lib/engine/consolidatedEngine";
import { triggerDownload } from "@/lib/engine/fileLoaders";
import {
  PageContainer,
  PageHeader,
  Card,
  Button,
  Alert,
  Input,
  Spinner,
} from "@/shared";
import {
  ReportResults,
  StepIndicator,
} from "@/features/reports/components";

export default function ConsolidatedPage() {
  const dispatch = useAppDispatch();
  const snaps = useAppSelector((s) => s.snapshots);
  const pay = useAppSelector((s) => s.payment);

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    if (!snaps.snapshotFile) {
      dispatch(setPayError("Veuillez sélectionner un snapshot de référence."));
      return;
    }
    if (!invoiceFile) {
      dispatch(setPayError("Veuillez sélectionner le fichier de facture."));
      return;
    }
    if (!pay.factDate || !pay.periodStart || !pay.periodEnd) {
      dispatch(setPayError("Veuillez renseigner toutes les dates."));
      return;
    }

    setRunning(true);
    setResult(null);
    dispatch(clearError());

    try {
      const res = await runConsolidated({
        refFiles: [snaps.snapshotFile.file],
        invoiceFile,
        factDate: pay.factDate,
        periodStart: pay.periodStart,
        periodEnd: pay.periodEnd,
        salesInvoiceFile: salesFile || undefined,
      });

      dispatch(
        addResults([
          {
            id: `consolidated-${Date.now()}`,
            name: res.consolidatedName,
            type: "consolidated",
            timestamp: Date.now(),
            status: "success",
          },
        ]),
      );

      setResult(res);
    } catch (e) {
      dispatch(setPayError(e instanceof Error ? e.message : "Erreur inconnue"));
    } finally {
      setRunning(false);
    }
  };

  const error = snaps.error || pay.error;

  const steps = [
    { number: 1, label: "Snapshot", completed: !!snaps.snapshotFile },
    { number: 2, label: "Facture", completed: !!invoiceFile },
    {
      number: 3,
      label: "Dates",
      completed: !!pay.factDate && !!pay.periodStart && !!pay.periodEnd,
    },
    { number: 4, label: "Générer", completed: !!result },
  ];

  const currentStep = !snaps.snapshotFile
    ? 1
    : !invoiceFile
      ? 2
      : !pay.factDate || !pay.periodStart || !pay.periodEnd
        ? 3
        : result
          ? 4
          : 3;

  return (
    <>
      <PageHeader
        title="Facture consolidée"
        description="Générez une facture consolidée paiement + ventes"
      />

      <PageContainer>
        <StepIndicator steps={steps} currentStep={currentStep} className="mb-6" />

        {error && (
          <Alert
            variant="error"
            title="Erreur"
            description={error}
            dismissible
            onClose={() => dispatch(clearError())}
            className="mb-6"
          />
        )}

        {/* Step 1: Snapshot */}
        <Card className="mb-6">
          <div className="px-6 py-4">
            <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
              <span className="step-badge">1</span>
              Snapshot de référence
            </h2>
            <Input
              type="file"
              accept=".csv"
              label="Charger le snapshot CSV"
              helperText={snaps.snapshotFile ? `✓ ${snaps.snapshotFile.name}` : undefined}
              onChange={(e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files?.[0]) {
                  dispatch(setSnapshotFile(files[0]));
                }
              }}
            />
          </div>
        </Card>

        {/* Step 2: Invoice File */}
        {snaps.snapshotFile && (
          <Card className="mb-6">
            <div className="px-6 py-4">
              <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
                <span className="step-badge">2</span>
                Fichier de facture
              </h2>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                label="Fichier CSV ou Excel"
                helperText={invoiceFile ? `✓ ${invoiceFile.name}` : undefined}
                onChange={(e) => {
                  const files = (e.target as HTMLInputElement).files;
                  setInvoiceFile(files?.[0] || null);
                }}
              />
            </div>
          </Card>
        )}

        {/* Step 3: Optional Sales File */}
        {invoiceFile && (
          <Card className="mb-6">
            <div className="px-6 py-4">
              <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
                <span className="step-badge">3</span>
                Facture de ventes (optionnel)
              </h2>
              <Input
                type="file"
                accept=".xlsx,.xls"
                label="Fichier Excel SalesInvoice"
                helperText={salesFile ? `✓ ${salesFile.name}` : undefined}
                onChange={(e) => {
                  const files = (e.target as HTMLInputElement).files;
                  setSalesFile(files?.[0] || null);
                }}
              />
            </div>
          </Card>
        )}

        {/* Step 4: Dates */}
        {invoiceFile && (
          <Card className="mb-6">
            <div className="px-6 py-4">
              <h2 className="font-semibold text-nouris-navy mb-4 flex items-center gap-2">
                <span className="step-badge">4</span>
                Période de facturation
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  type="date"
                  value={pay.factDate}
                  label="Date de téléchargement"
                  onChange={(e) => dispatch(setFactDate(e.target.value))}
                />
                <Input
                  type="date"
                  value={pay.periodStart}
                  label="Début"
                  onChange={(e) => dispatch(setPeriodStart(e.target.value))}
                />
                <Input
                  type="date"
                  value={pay.periodEnd}
                  label="Fin"
                  onChange={(e) => dispatch(setPeriodEnd(e.target.value))}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Run Button */}
        {invoiceFile && pay.factDate && pay.periodStart && pay.periodEnd && (
          <Card className="mb-6">
            <div className="px-6 py-4">
              <Button
                onClick={handleRun}
                disabled={running}
                isLoading={running}
                isFullWidth
                variant="primary"
              >
                {running
                  ? "Génération en cours..."
                  : "Générer la facture consolidée"}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="animate-slideInUp">
            <ReportResults
              title="Facture consolidée générée"
              files={[
                {
                  name: result.consolidatedName,
                  blob: result.consolidatedBlob,
                },
                {
                  name: result.updatedRefName,
                  blob: result.updatedRefBlob,
                },
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
                Générer une autre facture
              </Button>
            </div>
          </div>
        )}
      </PageContainer>

      {/* Processing Overlay */}
      {running && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
          <Spinner size="lg" text="Génération en cours..." />
        </div>
      )}
    </>
  );
}
