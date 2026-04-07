import { useState } from "react";
import { Row } from "../ModalRow";
import { fmtCurrency } from "../../../lib/format";
import type { CountryInfo } from "../../../lib/country-info";
import { GoldFlowSection } from "./GoldFlowSection";
import { ProducesSection } from "./ProducesSection";
import { ProducedGoodsSection } from "./ProducedGoodsSection";

type EconSubTab = "rgos" | "produced";

export const EconomyTab = ({
  stats,
  production,
  goodsRankings,
  goodAvgPrices,
  lastMonthProduced,
  producedGoodsRankings,
}: {
  stats: CountryInfo["stats"];
  production: CountryInfo["production"];
  goodsRankings: CountryInfo["goodsRankings"];
  goodAvgPrices: CountryInfo["goodAvgPrices"];
  lastMonthProduced: CountryInfo["lastMonthProduced"];
  producedGoodsRankings: CountryInfo["producedGoodsRankings"];
}) => {
  const [subTab, setSubTab] = useState<EconSubTab>("rgos");

  return (
    <div className="modal-rows">
      <Row label="Treasury" value={fmtCurrency(stats.gold)} />
      <Row
        label="Monthly Income (est.)"
        value={fmtCurrency(stats.monthlyIncome)}
      />
      <Row label="Trade Value" value={fmtCurrency(stats.monthlyTradeValue)} />
      <GoldFlowSection stats={stats} />
      <div className="modal-row-divider" />
      <div className="subtab-bar">
        <button
          className={`subtab-btn${subTab === "rgos" ? " subtab-active" : ""}`}
          onClick={() => setSubTab("rgos")}
        >
          RGOs
        </button>
        <button
          className={`subtab-btn${subTab === "produced" ? " subtab-active" : ""}`}
          onClick={() => setSubTab("produced")}
        >
          Produced Goods
        </button>
      </div>
      {subTab === "rgos" ? (
        <ProducesSection
          production={production}
          goodsRankings={goodsRankings}
          goodAvgPrices={goodAvgPrices}
        />
      ) : (
        <ProducedGoodsSection
          lastMonthProduced={lastMonthProduced}
          producedGoodsRankings={producedGoodsRankings}
          goodAvgPrices={goodAvgPrices}
        />
      )}
    </div>
  );
};
