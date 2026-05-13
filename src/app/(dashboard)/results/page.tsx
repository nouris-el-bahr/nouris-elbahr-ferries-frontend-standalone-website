"use client";

import { useAppDispatch, useAppSelector } from "@/store";
import {
  selectFilteredResults,
  selectPaymentResultsCount,
  selectSalesResultsCount,
  selectTotalResultsCount,
} from "@/store/selectors/resultsSelector";
import {
  setFilter,
  ResultFilter,
  clearResults,
} from "@/store/slices/resultsSlice";
import {
  PageContainer,
  PageHeader,
  Card,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableEmpty,
  Badge,
  Button,
} from "@/shared";
import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { MESSAGES } from "@/constants";

const RESULT_TYPE_LABELS: Record<string, string> = {
  payment: "Paiement",
  sales: "Ventes",
  consolidated: "Consolidé",
};

export default function ResultsPage() {
  const dispatch = useAppDispatch();
  const filtered = useAppSelector(selectFilteredResults);
  const paymentCount = useAppSelector(selectPaymentResultsCount);
  const salesCount = useAppSelector(selectSalesResultsCount);
  const totalCount = useAppSelector(selectTotalResultsCount);

  const tabs = [
    { id: "all", label: MESSAGES.RESULTS.TAB_ALL, badge: totalCount },
    { id: "payment", label: MESSAGES.RESULTS.TAB_PAYMENT, badge: paymentCount },
    { id: "sales", label: MESSAGES.RESULTS.TAB_SALES, badge: salesCount },
  ];

  return (
    <>
      <PageHeader
        title={MESSAGES.RESULTS.TITLE}
        description={MESSAGES.RESULTS.SUBTITLE}
        actions={
          totalCount > 0 && (
            <Button
              onClick={() => dispatch(clearResults())}
              variant="outline"
              size="sm"
              leftIcon={<Trash2 size={16} />}
            >
              {MESSAGES.RESULTS.CLEAR_ALL}
            </Button>
          )
        }
      />

      <PageContainer maxWidth="xl">
        <div className="mb-6">
          <Tabs
            items={tabs}
            defaultValue="all"
            onValueChange={(value) =>
              dispatch(setFilter(value as ResultFilter))
            }
          />
        </div>

        <Card>
          <Table>
            <TableHead>
              <TableRow isHeader>
                <TableHeaderCell>
                  {MESSAGES.RESULTS.FILE_COLUMN}
                </TableHeaderCell>
                <TableHeaderCell>
                  {MESSAGES.RESULTS.TYPE_COLUMN}
                </TableHeaderCell>
                <TableHeaderCell>
                  {MESSAGES.RESULTS.GENERATED_COLUMN}
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {totalCount === 0 ? (
                <TableEmpty message={MESSAGES.RESULTS.EMPTY} colSpan={3} />
              ) : filtered.length === 0 ? (
                <TableEmpty message={MESSAGES.RESULTS.NO_RESULTS_FOUND} colSpan={3} />
              ) : (
                filtered.map((r) => (
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
                        {RESULT_TYPE_LABELS[r.type] || r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      {formatDateTime(r.timestamp)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </PageContainer>
    </>
  );
}
