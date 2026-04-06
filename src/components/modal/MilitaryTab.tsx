import { Row, NumRow } from "./ModalRow";
import type { CountryInfo } from "../../lib/country-info";

export const MilitaryTab = ({ stats }: { stats: CountryInfo["stats"] }) => {
  const regStr = stats.infantryStr + stats.cavalryStr + stats.artilleryStr;
  const levyStr = stats.levyInfantryStr + stats.levyCavalryStr;
  const totalShips =
    stats.heavyShips + stats.lightShips + stats.galleys + stats.transports;

  return (
    <div className="modal-rows">
      <NumRow label="Regular Strength" value={regStr} />
      <Row
        label="Infantry / Cavalry / Artillery"
        value={`${stats.infantry} / ${stats.cavalry} / ${stats.artillery}`}
      />
      <NumRow label="Army Frontage" value={stats.armyFrontage} />
      {levyStr > 0 ? <NumRow label="Raised Levies" value={levyStr} /> : <></>}
      <div className="modal-row-divider" />
      <NumRow label="Manpower" value={stats.maxManpower} />
      {stats.monthlyManpower > 0 ? (
        <NumRow
          label="Monthly Manpower"
          value={stats.monthlyManpower}
          decimals={0}
        />
      ) : (
        <></>
      )}
      <NumRow label="Expected Army Size" value={stats.expectedArmySize} />
      {stats.armyMaintenance > 0 ? (
        <NumRow
          label="Army Maintenance"
          value={stats.armyMaintenance}
          decimals={1}
        />
      ) : (
        <></>
      )}
      {stats.armyTradition > 0 ? (
        <NumRow
          label="Army Tradition"
          value={stats.armyTradition}
          decimals={1}
        />
      ) : (
        <></>
      )}
      <div className="modal-row-divider" />
      {totalShips > 0 ? (
        <>
          <NumRow label="Navy Frontage" value={stats.navyFrontage} />
          <Row
            label="Heavy / Light / Galley"
            value={`${stats.heavyShips} / ${stats.lightShips} / ${stats.galleys}`}
          />
          <NumRow label="Transports" value={stats.transports} />
          <NumRow label="Sailors" value={stats.maxSailors} />
          {stats.monthlySailors > 0 ? (
            <NumRow
              label="Monthly Sailors"
              value={stats.monthlySailors}
              decimals={0}
            />
          ) : (
            <></>
          )}
          <NumRow label="Expected Navy Size" value={stats.expectedNavySize} />
          {stats.navyMaintenance > 0 ? (
            <NumRow
              label="Navy Maintenance"
              value={stats.navyMaintenance}
              decimals={1}
            />
          ) : (
            <></>
          )}
          {stats.navyTradition > 0 ? (
            <NumRow
              label="Navy Tradition"
              value={stats.navyTradition}
              decimals={1}
            />
          ) : (
            <></>
          )}
        </>
      ) : (
        <Row label="Navy" value="None" muted={true} />
      )}
      <div className="modal-row-divider" />
      {stats.militaryTactics > 0 ? (
        <NumRow
          label="Military Tactics"
          value={stats.militaryTactics}
          decimals={1}
        />
      ) : (
        <></>
      )}
      {stats.warExhaustion > 0 ? (
        <NumRow
          label="War Exhaustion"
          value={stats.warExhaustion}
          decimals={1}
        />
      ) : (
        <></>
      )}
    </div>
  );
};
