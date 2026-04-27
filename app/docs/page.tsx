import type { Metadata } from "next";
import { SwaggerDocs } from "./swagger-ui";

export const metadata: Metadata = {
  title: "API Docs | Devboard",
  description: "Interactive Swagger documentation for the Devboard API.",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-1">
          <p className="text-sm font-medium text-slate-500">Devboard API</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Swagger Documentation
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-2 py-6 sm:px-6">
        <SwaggerDocs />
      </div>
    </main>
  );
}
