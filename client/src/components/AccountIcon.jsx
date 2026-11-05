import { Landmark, Wallet } from "lucide-react";

export default function AccountIcon({ type, size = 18 }) {
  const Icon = type === "Bank Account" ? Landmark : Wallet;
  return <Icon size={size} aria-hidden="true" />;
}
