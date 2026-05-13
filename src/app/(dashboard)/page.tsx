"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppSelector } from "@/store";
import {
  selectRecentResults,
  selectPaymentResultsCount,
  selectSalesResultsCount,
  selectTotalResultsCount,
} from "@/store/selectors/resultsSelector";
import { ArrowRight, BarChart2, CreditCard, FileText } from "lucide-react";
import { SkeletonCard, Badge, PageHeader, PageContainer } from "@/shared";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/shared";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface StatCardProps {
  label: string;
  value: number | null;
  icon: React.ElementType;
  bg: string;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  bg,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="card flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={22} className="text-white opacity-50" />
        </div>
        <div className="flex-1">
          <SkeletonCard className="h-7 w-16 mb-2" />
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-nouris-navy">{value ?? 0}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalCount = useAppSelector(selectTotalResultsCount);
  const paymentCount = useAppSelector(selectPaymentResultsCount);
  const salesCount = useAppSelector(selectSalesResultsCount);
  const recent = useAppSelector((state) => selectRecentResults(state, 5));

  const statCards = [
    {
      label: "Total rapports",
      value: totalCount,
      icon: FileText,
      bg: "bg-nouris-navy",
      delay: "0ms",
    },
    {
      label: "Rapports de paiement",
      value: paymentCount,
      icon: CreditCard,
      bg: "bg-nouris",
      delay: "100ms",
    },
    {
      label: "Rapports de ventes",
      value: salesCount,
      icon: BarChart2,
      bg: "bg-nouris-d",
      delay: "200ms",
    },
  ];

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Mode hors ligne - Gestion des rapports Nouris El Bahr"
      />
      <PageContainer>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              animation: isMounted ? `slideInUp 0.5s ease-out ${card.delay} forwards` : "none",
              opacity: isMounted ? 1 : 0,
            }}
          >
            <StatCard
              label={card.label}
              value={card.value}
              icon={card.icon}
              bg={card.bg}
              loading={!isMounted}
            />
          </div>
        ))}
      </div>

      <div className="card mb-8">
        <h2 className="font-semibold text-nouris-navy mb-4">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/payment"
            className="btn-primary"
          >
            <CreditCard size={16} /> Rapport de paiement
          </Link>
          <Link
            href="/sales"
            className="btn-navy"
          >
            <BarChart2 size={16} /> Rapport de ventes
          </Link>
          <Link
            href="/consolidated"
            className="btn-navy"
          >
            <FileText size={16} /> Facture consolidée
          </Link>
          <Link
            href="/results"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-nouris transition-colors px-2 py-2.5"
          >
            Voir tous les résultats <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="card animate-fadeIn">
        <h2 className="font-semibold text-nouris-navy mb-4">Résultats de cette session</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Aucun résultat pour le moment. Générez des rapports pour les voir ici.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow isHeader>
                <TableHeaderCell>Fichier</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Généré le</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map((r) => (
                <TableRow key={`${r.type}-${r.name}-${r.timestamp}`}>
                  <TableCell className="break-all">
                    <span className="font-mono text-xs">{r.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.type === "payment"
                          ? "primary"
                          : r.type === "sales"
                            ? "success"
                            : "default"
                      }
                      size="sm"
                    >
                      {r.type === "payment"
                        ? "Paiement"
                        : r.type === "sales"
                          ? "Ventes"
                          : "Consolidé"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {formatDate(r.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      </PageContainer>
    </>
  );
}
