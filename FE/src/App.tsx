// File: src/App.tsx
import { QueryProvider } from "@/app/providers/query-provider";
import { Routes } from "@/app/routes";

export default function App() {
  return (
    <QueryProvider>
      <Routes />
    </QueryProvider>
  );
}
