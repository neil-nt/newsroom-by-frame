import { OnboardWizard } from "./onboard-wizard";

export const metadata = {
  title: "New Client — Newsroom",
};

export default function OnboardPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <OnboardWizard />
    </div>
  );
}
