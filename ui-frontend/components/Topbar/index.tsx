import Banner from "../common/Banner";

/** Banner strip only — logo / connect / nav live in fixed Navigation */
export default function Topbar() {
  return (
    <div className="flex flex-col">
      <Banner />
    </div>
  );
}
