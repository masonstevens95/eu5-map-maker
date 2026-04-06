import { Row, NumRow } from "./ModalRow";
import { fmtCurrency } from "../../lib/format";
import type { CountryInfo } from "../../lib/country-info";

export const EconomyTab = ({ stats }: { stats: CountryInfo["stats"] }) => (
  <div className="modal-rows">
    <Row label="Treasury" value={fmtCurrency(stats.gold)} />
    <Row
      label="Monthly Income (est.)"
      value={fmtCurrency(stats.monthlyIncome)}
    />
    <Row label="Trade Value" value={fmtCurrency(stats.monthlyTradeValue)} />
    {stats.monthlyGoldIncome > 0 ? (
      <NumRow
        label="Monthly Gold Income"
        value={stats.monthlyGoldIncome}
        decimals={1}
      />
    ) : (
      <></>
    )}
    {stats.monthlyGoldExpense > 0 ? (
      <NumRow
        label="Monthly Gold Expense"
        value={stats.monthlyGoldExpense}
        decimals={1}
      />
    ) : (
      <></>
    )}
    {stats.inflation !== 0 ? (
      <>
        <div className="modal-row-divider" />
        <NumRow label="Inflation" value={stats.inflation} decimals={2} />
      </>
    ) : (
      <></>
    )}
  </div>
);
