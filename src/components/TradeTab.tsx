import { useState } from "react";
import type { ParsedSave } from "../lib/types";

interface Props {
  parsed: ParsedSave;
}

type TradeSortMode = "production" | "name";

/** Format a good name for display. */
const fmtGood = (name: string): string =>
  name.replace(/^goods_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/** Format large numbers compactly. */
const fmtVal = (n: number): string =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000 ? (n / 1_000).toFixed(1) + "K"
    : n > 0 ? n.toFixed(0)
    : "—";

type MarketType = ParsedSave["trade"]["markets"][number];
type GoodType = MarketType["goods"][number];

type TradeSubTab = "goods" | "markets";

export const TradeTab = ({ parsed }: Props) => {
  const { trade } = parsed;
  const [subTab, setSubTab] = useState<TradeSubTab>("goods");
  const [sortMode, setSortMode] = useState<TradeSortMode>("production");
  const [selectedMarket, setSelectedMarket] = useState<MarketType | undefined>(undefined);
  const [selectedGood, setSelectedGood] = useState<string | undefined>(undefined);

  return (
    <div className="rankings-tab">
      <div className="rankings-controls">
        <div className="subtab-bar">
          <button
            className={`subtab-btn${subTab === "goods" ? " subtab-active" : ""}`}
            onClick={() => setSubTab("goods")}
          >
            Goods ({Object.keys(trade.producedGoods).length})
          </button>
          <button
            className={`subtab-btn${subTab === "markets" ? " subtab-active" : ""}`}
            onClick={() => setSubTab("markets")}
          >
            Markets ({trade.markets.length})
          </button>
        </div>
        {subTab === "goods" ? (
          <label className="option">
            Sort:
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as TradeSortMode)}
              className="style-select"
            >
              <option value="production">By Production</option>
              <option value="name">By Name</option>
            </select>
          </label>
        ) : (<></>)}
      </div>

      {subTab === "goods" ? (
        <GoodsSubTab
          producedGoods={trade.producedGoods}
          markets={trade.markets}
          sortMode={sortMode}
          selectedGood={selectedGood}
          onSelectGood={setSelectedGood}
        />
      ) : (
        <MarketsSubTab
          markets={trade.markets}
          selectedMarket={selectedMarket}
          onSelectMarket={setSelectedMarket}
        />
      )}
    </div>
  );
};

const GoodsSubTab = ({ producedGoods, markets, sortMode, selectedGood, onSelectGood }: {
  producedGoods: Readonly<Record<string, number>>;
  markets: ParsedSave["trade"]["markets"];
  sortMode: TradeSortMode;
  selectedGood: string | undefined;
  onSelectGood: (g: string | undefined) => void;
}) => {
  const sortedGoods = [...Object.entries(producedGoods)].sort((a, b) =>
    sortMode === "production" ? b[1] - a[1] : a[0].localeCompare(b[0])
  );

  return (
    <>
      <div className="trade-goods-grid">
        {sortedGoods.map(([name, val]) => (
          <div
            key={name}
            className={`trade-good-card${selectedGood === name ? " trade-good-selected" : ""}`}
            onClick={() => onSelectGood(selectedGood === name ? undefined : name)}
          >
            <span className="trade-good-name">{fmtGood(name)}</span>
            <span className="trade-good-val">{fmtVal(val)}</span>
          </div>
        ))}
      </div>

      {selectedGood !== undefined ? (
        <GoodModal goodName={selectedGood} markets={markets} onClose={() => onSelectGood(undefined)} />
      ) : (<></>)}
    </>
  );
};

const MarketsSubTab = ({ markets, selectedMarket, onSelectMarket }: {
  markets: ParsedSave["trade"]["markets"];
  selectedMarket: MarketType | undefined;
  onSelectMarket: (m: MarketType | undefined) => void;
}) => {
  const sortedMarkets = [...markets].sort((a, b) => b.population - a.population);

  return (
    <>
      <div className="rankings-grid">
        {sortedMarkets.map((market) => (
          <div
            key={market.id}
            className="ranking-row"
            style={{ borderLeftColor: "#48a" }}
            onClick={() => onSelectMarket(market)}
          >
            <span className="ranking-pos">{market.id}</span>
            <div className="ranking-info">
              <span className="ranking-name">Market {market.id}</span>
              <span className="ranking-ai">{market.goods.length} goods</span>
            </div>
            <div className="ranking-stats">
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtVal(market.population)}</span>
                <span className="ranking-stat-lbl">Population</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{market.price.toFixed(1)}</span>
                <span className="ranking-stat-lbl">Price Level</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtVal(market.food)}</span>
                <span className="ranking-stat-lbl">Food</span>
              </div>
              <div className="ranking-stat">
                <span className="ranking-stat-val">{fmtVal(market.capacity)}</span>
                <span className="ranking-stat-lbl">Capacity</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMarket !== undefined ? (
        <MarketModal market={selectedMarket} onClose={() => onSelectMarket(undefined)} />
      ) : (<></>)}
    </>
  );
};

/** Modal showing per-market breakdown for a specific good. */
const GoodModal = ({ goodName, markets, onClose }: {
  goodName: string;
  markets: ParsedSave["trade"]["markets"];
  onClose: () => void;
}) => {
  // Find this good across all markets
  const marketGoods = markets
    .map(m => {
      const g = m.goods.find(g2 => g2.name === goodName);
      return g ? { marketId: m.id, ...g } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.supply - a.supply);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ borderColor: "#48a", maxWidth: "700px" }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>
        <div className="modal-header" style={{ borderBottomColor: "#48a" }}>
          <div className="modal-titles">
            <h2 className="modal-name">{fmtGood(goodName)}</h2>
            <span className="modal-tag">Traded in {marketGoods.length} markets</span>
          </div>
        </div>
        <div className="modal-body">
          <div className="trade-good-markets">
            <div className="trade-market-header">
              <span>Market</span>
              <span>Price</span>
              <span>Supply</span>
              <span>Demand</span>
              <span>Surplus</span>
              <span>Stockpile</span>
            </div>
            {marketGoods.map((mg) => (
              <div key={mg.marketId} className="trade-market-row">
                <span>Market {mg.marketId}</span>
                <span>{mg.price.toFixed(1)}</span>
                <span>{fmtVal(mg.supply)}</span>
                <span>{fmtVal(mg.demand)}</span>
                <span>{mg.surplus > 0 ? "+" : ""}{fmtVal(mg.surplus)}</span>
                <span>{fmtVal(mg.stockpile)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Modal showing all goods in a specific market. */
const MarketModal = ({ market, onClose }: { market: MarketType; onClose: () => void }) => {
  const sortedGoods = [...market.goods].sort((a, b) => b.supply - a.supply);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ borderColor: "#48a", maxWidth: "700px" }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>x</button>
        <div className="modal-header" style={{ borderBottomColor: "#48a" }}>
          <div className="modal-titles">
            <h2 className="modal-name">Market {market.id}</h2>
            <span className="modal-tag">Pop: {fmtVal(market.population)} — Price level: {market.price.toFixed(1)}</span>
          </div>
        </div>
        <div className="modal-body">
          <div className="modal-stats-grid">
            <div className="modal-stat">
              <span className="modal-stat-value">{fmtVal(market.population)}</span>
              <span className="modal-stat-label">Population</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{market.price.toFixed(1)}</span>
              <span className="modal-stat-label">Price Level</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{fmtVal(market.food)}</span>
              <span className="modal-stat-label">Food</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{fmtVal(market.capacity)}</span>
              <span className="modal-stat-label">Capacity</span>
            </div>
          </div>
          <div className="modal-divider" />
          <div className="trade-good-markets">
            <div className="trade-market-header">
              <span>Good</span>
              <span>Price</span>
              <span>Supply</span>
              <span>Demand</span>
              <span>Surplus</span>
              <span>Stockpile</span>
            </div>
            {sortedGoods.map((g) => (
              <div key={g.name} className="trade-market-row">
                <span>{fmtGood(g.name)}</span>
                <span>{g.price.toFixed(1)}</span>
                <span>{fmtVal(g.supply)}</span>
                <span>{fmtVal(g.demand)}</span>
                <span>{g.surplus > 0 ? "+" : ""}{fmtVal(g.surplus)}</span>
                <span>{fmtVal(g.stockpile)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
