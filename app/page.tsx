import Dashboard from "./dashboard";
import data from "../public/results.json";
import { reportSchema } from "../lib/report";
export default function Page() {
  return <Dashboard initial={reportSchema.parse(data)} />;
}
