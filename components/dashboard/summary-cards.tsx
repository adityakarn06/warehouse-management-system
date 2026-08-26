import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

const summaryItems = [
  { label: "Active trucks", value: "—" },
  { label: "Delayed", value: "—" },
  { label: "Arriving", value: "—" },
  { label: "Docks available", value: "—" },
];

export function SummaryCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {summaryItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex flex-col gap-1">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-xl">{item.value}</CardTitle>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
